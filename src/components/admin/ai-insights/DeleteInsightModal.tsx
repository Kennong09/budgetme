import { FC, useState } from "react";
import { Badge } from "react-bootstrap";
import { AIInsightSummary, AI_SERVICES } from "./types";

interface DeleteInsightModalProps {
  show: boolean;
  insight: AIInsightSummary;
  onClose: () => void;
  onInsightDeleted: () => void;
  onDelete: (id: string) => Promise<boolean>;
}

const DeleteInsightModal: FC<DeleteInsightModalProps> = ({
  show,
  insight,
  onClose,
  onInsightDeleted,
  onDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>('');
  const [confirmText, setConfirmText] = useState('');

  if (!show || !insight) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      const success = await onDelete(insight.insightId);
      if (success) {
        onInsightDeleted();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete insight');
      setIsDeleting(false);
    }
  };

  const getRiskInfo = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return { label: 'High', color: '#dc3545', bg: 'danger' };
      case 'medium': return { label: 'Medium', color: '#fd7e14', bg: 'warning' };
      case 'low': return { label: 'Low', color: '#28a745', bg: 'success' };
      default: return { label: 'Unknown', color: '#6c757d', bg: 'secondary' };
    }
  };

  const riskInfo = getRiskInfo(insight.riskLevel);
  const serviceConfig = AI_SERVICES.find(s => s.value === insight.aiService);
  const isConfirmed = confirmText.toLowerCase() === 'delete';

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={onClose}>
        <div 
          className="modal-dialog modal-md modal-dialog-centered modal-dialog-scrollable" 
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
                  <i className={`fas fa-trash-alt ${window.innerWidth < 768 ? '' : 'fa-lg'}`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-sm md:text-base truncate">Delete AI Insight</h6>
                  <small className="d-block truncate" style={{ opacity: 0.9, fontSize: window.innerWidth < 768 ? '0.7rem' : '0.8rem' }}>
                    This action cannot be undone
                  </small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={onClose} 
                  disabled={isDeleting}
                  style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}
                >
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body py-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              
              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-exclamation-circle mr-2"></i>{error}
                </div>
              )}

              {/* Warning Banner */}
              <div className="p-3 mb-3" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                <div className="d-flex align-items-start">
                  <i className="fas fa-exclamation-triangle text-danger mr-2 mt-1"></i>
                  <div>
                    <strong className="text-danger" style={{ fontSize: '0.9rem' }}>Permanent Deletion</strong>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                      This will permanently remove the AI insight and all associated data including analytics, recommendations, and usage history.
                    </p>
                  </div>
                </div>
              </div>

              {/* Insight Summary Card */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <div className="d-flex align-items-center mb-3">
                  {insight.avatarUrl ? (
                    <img src={insight.avatarUrl} alt={insight.username} className="rounded-circle mr-2"
                         style={{ width: '36px', height: '36px', objectFit: 'cover' }} />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center bg-danger text-white rounded-circle mr-2"
                         style={{ width: '36px', height: '36px', fontSize: '0.9rem', fontWeight: 600 }}>
                      {insight.username?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{insight.username || 'Unknown User'}</strong>
                    <div className="d-flex align-items-center" style={{ gap: '6px' }}>
                      <Badge bg={riskInfo.bg} style={{ fontSize: '0.65rem' }}>{riskInfo.label} Risk</Badge>
                      <Badge bg="info" style={{ fontSize: '0.65rem' }}>{serviceConfig?.label || insight.aiService}</Badge>
                    </div>
                  </div>
                </div>

                {/* Stats Grid - Mobile Optimized */}
                {/* Mobile: 2x2 Grid */}
                <div className="block md:hidden">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-white rounded-lg text-center">
                      <p className="text-[8px] text-gray-500 leading-none mb-0.5">Confidence</p>
                      <p className="text-[12px] font-bold text-red-500">{insight.confidenceLevel}%</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg text-center">
                      <p className="text-[8px] text-gray-500 leading-none mb-0.5">Tokens</p>
                      <p className="text-[12px] font-bold text-red-500">{insight.tokenUsage || 0}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg text-center">
                      <p className="text-[8px] text-gray-500 leading-none mb-0.5">Time</p>
                      <p className="text-[12px] font-bold text-red-500">{insight.processingTime || 0}ms</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg text-center">
                      <p className="text-[8px] text-gray-500 leading-none mb-0.5">Status</p>
                      <p className="text-[12px] font-bold text-red-500 capitalize">{insight.status}</p>
                    </div>
                  </div>
                </div>
                {/* Desktop: Row Layout */}
                <div className="hidden md:block">
                  <div className="row text-center g-2">
                    <div className="col-3">
                      <div className="p-2" style={{ background: 'white', borderRadius: '6px' }}>
                        <div className="text-danger font-weight-bold" style={{ fontSize: '0.95rem' }}>
                          {insight.confidenceLevel}%
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>Confidence</small>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="p-2" style={{ background: 'white', borderRadius: '6px' }}>
                        <div className="text-danger font-weight-bold" style={{ fontSize: '0.95rem' }}>
                          {insight.tokenUsage || 0}
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>Tokens</small>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="p-2" style={{ background: 'white', borderRadius: '6px' }}>
                        <div className="text-danger font-weight-bold" style={{ fontSize: '0.95rem' }}>
                          {insight.processingTime || 0}ms
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>Time</small>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="p-2" style={{ background: 'white', borderRadius: '6px' }}>
                        <div className="text-danger font-weight-bold" style={{ fontSize: '0.95rem' }}>
                          {insight.status}
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>Status</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* What Will Be Deleted */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-list mr-2"></i>Data to be removed:
                </h6>
                <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
                  {[
                    { icon: 'fa-brain', label: 'AI Analysis' },
                    { icon: 'fa-chart-bar', label: 'Metrics' },
                    { icon: 'fa-shield-alt', label: 'Risk Data' },
                    { icon: 'fa-lightbulb', label: 'Recommendations' },
                    { icon: 'fa-history', label: 'Usage Logs' },
                    { icon: 'fa-coins', label: 'Token Data' }
                  ].map((item, i) => (
                    <span key={i} className="badge badge-light px-2 py-1" 
                          style={{ fontSize: '0.75rem', border: '1px solid #dee2e6' }}>
                      <i className={`fas ${item.icon} text-danger mr-1`}></i>{item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Confirmation Input */}
              <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <label className="mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-keyboard text-danger mr-2"></i>
                  Type <strong className="text-danger">delete</strong> to confirm:
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Type 'delete' to confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isDeleting}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
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
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{insight.insightId?.substring(0, 12)}...</code>
              </small>
              <div className="d-flex w-100 gap-2" style={{ gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={onClose} 
                  disabled={isDeleting}
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
                  onClick={handleDelete} 
                  disabled={isDeleting || !isConfirmed}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-1"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash-alt mr-1"></i>Delete
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

export default DeleteInsightModal;
