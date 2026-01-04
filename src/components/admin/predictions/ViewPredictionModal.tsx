import { FC, useState } from "react";
import { Badge } from "react-bootstrap";
import { PredictionSummary } from "./types";

interface ViewPredictionModalProps {
  prediction: PredictionSummary | null;
  show: boolean;
  onClose: () => void;
  onDelete: (prediction: PredictionSummary) => void;
}

const ViewPredictionModal: FC<ViewPredictionModalProps> = ({
  prediction,
  show,
  onClose,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!show || !prediction) return null;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', color: '#28a745', bgColor: 'rgba(40, 167, 69, 0.1)', icon: 'fa-check-circle' };
      case 'pending':
        return { label: 'Pending', color: '#fd7e14', bgColor: 'rgba(253, 126, 20, 0.1)', icon: 'fa-clock' };
      case 'error':
        return { label: 'Error', color: '#dc3545', bgColor: 'rgba(220, 53, 69, 0.1)', icon: 'fa-exclamation-triangle' };
      default:
        return { label: 'Unknown', color: '#6c757d', bgColor: 'rgba(108, 117, 125, 0.1)', icon: 'fa-question-circle' };
    }
  };

  const getTrendInfo = (value: number) => {
    if (value > 0) return { color: '#28a745', icon: 'fa-arrow-up', label: 'Up' };
    if (value < 0) return { color: '#dc3545', icon: 'fa-arrow-down', label: 'Down' };
    return { color: '#6c757d', icon: 'fa-minus', label: 'Stable' };
  };

  const formatTrend = (value: number) => {
    if (!value || value === 0) return "0%";
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const statusInfo = getStatusInfo(prediction.status);
  const accuracyPercent = prediction.predictionAccuracy || 0;

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
                  <i className={`fas fa-chart-line ${window.innerWidth < 768 ? '' : 'fa-lg'}`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-sm md:text-base truncate">Prediction Details</h6>
                  <small className="d-block truncate" style={{ opacity: 0.9, fontSize: window.innerWidth < 768 ? '0.7rem' : '0.8rem' }}>
                    {prediction.username}
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
                    <i className={`fas ${statusInfo.icon} text-xs`} style={{ color: statusInfo.color }}></i>
                    <div>
                      <p className="text-[8px] text-gray-500 leading-none">Status</p>
                      <p className="text-[10px] font-bold" style={{ color: statusInfo.color }}>{statusInfo.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-2">
                    <i className="fas fa-bullseye text-red-500 text-xs"></i>
                    <div>
                      <p className="text-[8px] text-gray-500 leading-none">Accuracy</p>
                      <p className="text-[10px] font-bold text-red-500">{accuracyPercent.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-2">
                    <i className="fas fa-chart-bar text-red-500 text-xs"></i>
                    <div>
                      <p className="text-[8px] text-gray-500 leading-none">Count</p>
                      <p className="text-[10px] font-bold text-red-500">{prediction.predictionCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-2">
                    <i className="fas fa-calendar-alt text-red-500 text-xs"></i>
                    <div>
                      <p className="text-[8px] text-gray-500 leading-none">Updated</p>
                      <p className="text-[10px] font-bold text-red-500">
                        {prediction.lastPredictionDate ? new Date(prediction.lastPredictionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Desktop: Row Layout */}
              <div className="hidden md:block">
                <div className="row text-center g-2">
                  <div className="col-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className={`fas ${statusInfo.icon} mr-2`} style={{ color: statusInfo.color }}></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Status</small>
                        <strong style={{ color: statusInfo.color, fontSize: '0.8rem' }}>{statusInfo.label}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-bullseye text-danger mr-2"></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Accuracy</small>
                        <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{accuracyPercent.toFixed(1)}%</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-chart-bar text-danger mr-2"></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Count</small>
                        <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{prediction.predictionCount}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-calendar-alt text-danger mr-2"></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Updated</small>
                        <strong className="text-danger" style={{ fontSize: '0.8rem' }}>
                          {prediction.lastPredictionDate ? new Date(prediction.lastPredictionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                        </strong>
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
                    { id: 'trends', icon: 'fa-chart-line', label: 'Trends' },
                    { id: 'actions', icon: 'fa-cogs', label: 'Actions' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      className={`flex-1 py-1.5 px-2 rounded-full text-[10px] font-medium transition-colors ${
                        activeTab === tab.id 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <i className={`fas ${tab.icon} mr-1`}></i>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Desktop: Normal Tabs */}
              <div className="hidden md:flex" style={{ gap: '6px' }}>
                {[
                  { id: 'overview', icon: 'fa-chart-pie', label: 'Overview' },
                  { id: 'trends', icon: 'fa-chart-line', label: 'Trends' },
                  { id: 'actions', icon: 'fa-cogs', label: 'Actions' }
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
            <div className="modal-body py-3" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="row">
                  {/* Left Column - Profile */}
                  <div className="col-lg-5 text-center mb-3 mb-lg-0">
                    <div className="position-relative d-inline-block mb-3">
                      <div className="d-flex align-items-center justify-content-center rounded-circle"
                           style={{ width: '100px', height: '100px', background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', margin: '0 auto' }}>
                        <i className="fas fa-chart-line fa-3x text-white"></i>
                      </div>
                      <div className="position-absolute" style={{ bottom: '5px', right: '5px', width: '20px', height: '20px', borderRadius: '50%', background: statusInfo.color, border: '2px solid white' }}></div>
                    </div>
                    <h6 className="font-weight-bold mb-1">{prediction.username}</h6>
                    <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                      <code style={{ fontSize: '0.75rem' }}>{prediction.userId.substring(0, 12)}...</code>
                    </p>
                    <div className="d-flex justify-content-center flex-wrap" style={{ gap: '6px' }}>
                      <Badge bg={prediction.status === 'active' ? 'success' : prediction.status === 'pending' ? 'warning' : 'danger'} style={{ fontSize: '0.7rem' }}>
                        <i className={`fas ${statusInfo.icon} mr-1`}></i>{statusInfo.label}
                      </Badge>
                      <Badge bg="primary" style={{ fontSize: '0.7rem' }}>
                        <i className="fas fa-chart-bar mr-1"></i>{prediction.predictionCount} Predictions
                      </Badge>
                      {accuracyPercent > 0 && (
                        <Badge bg="info" style={{ fontSize: '0.7rem' }}>
                          <i className="fas fa-bullseye mr-1"></i>{accuracyPercent.toFixed(1)}% Accuracy
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Quick Info */}
                  <div className="col-lg-7">
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-info-circle mr-2"></i>Prediction Info</h6>
                    <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">User ID</small>
                        <code style={{ fontSize: '0.75rem' }}>{prediction.userId.substring(0, 16)}...</code>
                      </div>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">Total Predictions</small>
                        <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{prediction.predictionCount}</strong>
                      </div>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">Accuracy Score</small>
                        <strong className={accuracyPercent >= 80 ? 'text-success' : accuracyPercent >= 60 ? 'text-warning' : 'text-danger'} style={{ fontSize: '0.8rem' }}>
                          {accuracyPercent > 0 ? `${accuracyPercent.toFixed(1)}%` : 'N/A'}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                        <small className="text-muted">Status</small>
                        <Badge bg={prediction.status === 'active' ? 'success' : prediction.status === 'pending' ? 'warning' : 'danger'} style={{ fontSize: '0.65rem' }}>
                          {prediction.status.charAt(0).toUpperCase() + prediction.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="d-flex justify-content-between py-1">
                        <small className="text-muted">Last Updated</small>
                        <span style={{ fontSize: '0.8rem' }}>{prediction.lastPredictionDate || 'Never'}</span>
                      </div>
                    </div>

                    {/* Accuracy Gauge */}
                    <div className="mt-3">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-tachometer-alt mr-2"></i>Accuracy Score</h6>
                      <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <div className="d-flex justify-content-between mb-1">
                          <small>Model Accuracy</small>
                          <strong className={accuracyPercent >= 80 ? 'text-success' : accuracyPercent >= 60 ? 'text-warning' : 'text-danger'} style={{ fontSize: '0.85rem' }}>
                            {accuracyPercent.toFixed(1)}%
                          </strong>
                        </div>
                        <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
                          <div 
                            className={`progress-bar ${accuracyPercent >= 80 ? 'bg-success' : accuracyPercent >= 60 ? 'bg-warning' : 'bg-danger'}`}
                            style={{ width: `${accuracyPercent}%`, borderRadius: '3px' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trends Tab */}
              {activeTab === 'trends' && (
                <div>
                  <h6 className="text-danger mb-3" style={{ fontSize: '0.9rem' }}><i className="fas fa-chart-area mr-2"></i>Financial Trends Analysis</h6>
                  <div className="row g-2">
                    {/* Income Trend */}
                    <div className="col-md-4 mb-3">
                      <div className="p-3 text-center h-100" style={{ background: '#f8f9fa', borderRadius: '8px', border: `2px solid ${getTrendInfo(prediction.incomeTrend).color}20` }}>
                        <div className="d-flex align-items-center justify-content-center mb-2" 
                             style={{ width: '50px', height: '50px', background: `${getTrendInfo(prediction.incomeTrend).color}15`, borderRadius: '50%', margin: '0 auto' }}>
                          <i className={`fas ${getTrendInfo(prediction.incomeTrend).icon}`} style={{ color: getTrendInfo(prediction.incomeTrend).color, fontSize: '1.2rem' }}></i>
                        </div>
                        <h6 className="mb-1" style={{ fontSize: '0.85rem' }}>Income Trend</h6>
                        <h4 className="mb-0 font-weight-bold" style={{ color: getTrendInfo(prediction.incomeTrend).color }}>
                          {formatTrend(prediction.incomeTrend)}
                        </h4>
                        <small className="text-muted">{getTrendInfo(prediction.incomeTrend).label}</small>
                      </div>
                    </div>

                    {/* Expense Trend */}
                    <div className="col-md-4 mb-3">
                      <div className="p-3 text-center h-100" style={{ background: '#f8f9fa', borderRadius: '8px', border: `2px solid ${getTrendInfo(prediction.expenseTrend).color}20` }}>
                        <div className="d-flex align-items-center justify-content-center mb-2" 
                             style={{ width: '50px', height: '50px', background: `${getTrendInfo(prediction.expenseTrend).color}15`, borderRadius: '50%', margin: '0 auto' }}>
                          <i className={`fas ${getTrendInfo(prediction.expenseTrend).icon}`} style={{ color: getTrendInfo(prediction.expenseTrend).color, fontSize: '1.2rem' }}></i>
                        </div>
                        <h6 className="mb-1" style={{ fontSize: '0.85rem' }}>Expense Trend</h6>
                        <h4 className="mb-0 font-weight-bold" style={{ color: getTrendInfo(prediction.expenseTrend).color }}>
                          {formatTrend(prediction.expenseTrend)}
                        </h4>
                        <small className="text-muted">{getTrendInfo(prediction.expenseTrend).label}</small>
                      </div>
                    </div>

                    {/* Savings Trend */}
                    <div className="col-md-4 mb-3">
                      <div className="p-3 text-center h-100" style={{ background: '#f8f9fa', borderRadius: '8px', border: `2px solid ${getTrendInfo(prediction.savingsTrend).color}20` }}>
                        <div className="d-flex align-items-center justify-content-center mb-2" 
                             style={{ width: '50px', height: '50px', background: `${getTrendInfo(prediction.savingsTrend).color}15`, borderRadius: '50%', margin: '0 auto' }}>
                          <i className={`fas ${getTrendInfo(prediction.savingsTrend).icon}`} style={{ color: getTrendInfo(prediction.savingsTrend).color, fontSize: '1.2rem' }}></i>
                        </div>
                        <h6 className="mb-1" style={{ fontSize: '0.85rem' }}>Savings Trend</h6>
                        <h4 className="mb-0 font-weight-bold" style={{ color: getTrendInfo(prediction.savingsTrend).color }}>
                          {formatTrend(prediction.savingsTrend)}
                        </h4>
                        <small className="text-muted">{getTrendInfo(prediction.savingsTrend).label}</small>
                      </div>
                    </div>
                  </div>

                  {/* Trend Summary */}
                  <div className="p-3 mt-2" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}><i className="fas fa-lightbulb mr-2"></i>Trend Summary</h6>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                      Based on the prediction analysis, this user shows 
                      <strong style={{ color: getTrendInfo(prediction.incomeTrend).color }}> {getTrendInfo(prediction.incomeTrend).label.toLowerCase()} income</strong>,
                      <strong style={{ color: getTrendInfo(prediction.expenseTrend).color }}> {getTrendInfo(prediction.expenseTrend).label.toLowerCase()} expenses</strong>, and
                      <strong style={{ color: getTrendInfo(prediction.savingsTrend).color }}> {getTrendInfo(prediction.savingsTrend).label.toLowerCase()} savings</strong> trends.
                    </p>
                  </div>
                </div>
              )}

              {/* Actions Tab */}
              {activeTab === 'actions' && (
                <div>
                  <h6 className="text-danger mb-3" style={{ fontSize: '0.9rem' }}><i className="fas fa-tools mr-2"></i>Prediction Management</h6>
                  <div className="row g-2">
                    <div className="col-md-6 mb-2">
                      <div 
                        className="p-3 text-center h-100" 
                        style={{ background: '#f8f9fa', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s' }}
                        onClick={() => onDelete(prediction)}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dc3545'; e.currentTarget.style.background = '#fff5f5'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f8f9fa'; }}
                      >
                        <div className="d-flex align-items-center justify-content-center mb-2" style={{ width: '40px', height: '40px', background: 'rgba(220, 53, 69, 0.1)', borderRadius: '8px', margin: '0 auto' }}>
                          <i className="fas fa-trash-alt text-danger"></i>
                        </div>
                        <h6 className="mb-1" style={{ fontSize: '0.85rem' }}>Delete Prediction</h6>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Permanently remove all data</small>
                      </div>
                    </div>
                  </div>
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
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{prediction.userId?.substring(0, 12)}...</code>
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

export default ViewPredictionModal;