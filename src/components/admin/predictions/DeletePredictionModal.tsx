import { FC, useState } from "react";
import { Badge } from "react-bootstrap";
import { PredictionSummary } from "./types";

interface DeletePredictionModalProps {
  show: boolean;
  prediction: PredictionSummary | null;
  onClose: () => void;
  onDelete: (userId: string) => Promise<void>;
  loading?: boolean;
}

const DeletePredictionModal: FC<DeletePredictionModalProps> = ({
  show,
  prediction,
  onClose,
  onDelete,
  loading = false
}) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!prediction) return;

    if (deleteConfirmation !== "DELETE") {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(prediction.userId);
      handleClose();
    } catch (error) {
      console.error("Error deleting prediction:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setDeleteConfirmation("");
    onClose();
  };

  if (!show || !prediction) return null;

  const isDeleteEnabled = deleteConfirmation === "DELETE" && !isDeleting;
  const accuracyPercent = prediction.predictionAccuracy || 0;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={handleClose}>
        <div 
          className="modal-dialog modal-dialog-centered modal-dialog-scrollable" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: '0 auto', maxWidth: window.innerWidth < 768 ? '95vw' : '480px' }}
        >
          <div 
            className="modal-content border-0 shadow-lg" 
            style={{ 
              borderRadius: window.innerWidth < 768 ? '0' : '12px', 
              overflow: 'hidden', 
              maxHeight: window.innerWidth < 768 ? '100vh' : '80vh',
              minHeight: window.innerWidth < 768 ? '100vh' : 'auto'
            }}
          >
            
            {/* Header - Mobile Optimized */}
            <div className="modal-header border-0 text-white py-2 md:py-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
              <div className="d-flex align-items-center w-100">
                <div className="d-flex align-items-center justify-content-center mr-2" 
                     style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                  <i className="fas fa-trash-alt"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-0 font-weight-bold text-sm md:text-base">Delete Prediction</h6>
                  <small className="hidden md:inline" style={{ opacity: 0.9 }}>This action cannot be undone</small>
                </div>
                <button type="button" className="btn btn-light btn-sm" onClick={handleClose} disabled={isDeleting}
                        style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Modal Body - Mobile Optimized */}
            <div className="modal-body py-2 md:py-3 px-2 md:px-4" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              
              {/* Warning Banner */}
              <div className="p-2 md:p-3 mb-3 bg-red-50 rounded-lg" style={{ borderLeft: '3px solid #dc3545' }}>
                <div className="flex items-start gap-2">
                  <i className="fas fa-exclamation-triangle text-red-500 mt-0.5 text-xs md:text-sm"></i>
                  <div>
                    <strong className="text-red-500 text-xs md:text-sm">Permanent Deletion</strong>
                    <p className="mb-0 text-gray-500 text-[10px] md:text-xs">
                      This will permanently remove all prediction data for this user.
                    </p>
                  </div>
                </div>
              </div>

              {/* Prediction Summary Card */}
              <div className="p-2 md:p-3 mb-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2 md:mb-3">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center"
                       style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
                    <i className="fas fa-chart-line text-white text-xs md:text-sm"></i>
                  </div>
                  <div>
                    <strong className="text-xs md:text-sm block">{prediction.username}</strong>
                    <div className="flex items-center gap-1">
                      <span className={`px-1 py-0.5 rounded text-[8px] md:text-[10px] font-semibold ${
                        prediction.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                        prediction.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {prediction.status}
                      </span>
                      <span className="bg-blue-100 text-blue-600 px-1 py-0.5 rounded text-[8px] md:text-[10px] font-semibold">
                        {prediction.predictionCount} predictions
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-1 md:gap-2 text-center">
                  <div className="p-1.5 md:p-2 bg-white rounded-md">
                    <span className="text-gray-500 block text-[8px] md:text-[10px]">Predictions</span>
                    <strong className="text-red-500 text-xs md:text-sm">{prediction.predictionCount}</strong>
                  </div>
                  <div className="p-1.5 md:p-2 bg-white rounded-md">
                    <span className="text-gray-500 block text-[8px] md:text-[10px]">Accuracy</span>
                    <strong className={`text-xs md:text-sm ${accuracyPercent >= 80 ? 'text-emerald-500' : accuracyPercent >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {accuracyPercent > 0 ? `${accuracyPercent.toFixed(1)}%` : 'N/A'}
                    </strong>
                  </div>
                  <div className="p-1.5 md:p-2 bg-white rounded-md">
                    <span className="text-gray-500 block text-[8px] md:text-[10px]">Updated</span>
                    <strong className="text-gray-600 text-[10px] md:text-xs">
                      {prediction.lastPredictionDate ? new Date(prediction.lastPredictionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* What will be deleted - Compact on mobile */}
              <h6 className="text-red-500 mb-2 text-[11px] md:text-sm flex items-center">
                <i className="fas fa-list mr-2"></i>What Will Be Deleted
              </h6>
              <div className="p-2 md:p-3 mb-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-1 text-[9px] md:text-xs">
                  <div className="flex items-start gap-1">
                    <i className="fas fa-database text-red-500 mt-0.5 text-[8px] md:text-[10px]"></i>
                    <span className="text-gray-500">Historical data</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <i className="fas fa-bullseye text-red-500 mt-0.5 text-[8px] md:text-[10px]"></i>
                    <span className="text-gray-500">Accuracy metrics</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <i className="fas fa-chart-line text-red-500 mt-0.5 text-[8px] md:text-[10px]"></i>
                    <span className="text-gray-500">Trend analysis</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <i className="fas fa-history text-red-500 mt-0.5 text-[8px] md:text-[10px]"></i>
                    <span className="text-gray-500">Confidence scores</span>
                  </div>
                </div>
              </div>

              {/* Confirmation Input */}
              <h6 className="text-red-500 mb-2 text-[11px] md:text-sm flex items-center">
                <i className="fas fa-keyboard mr-2"></i>Confirmation Required
              </h6>
              <div className="p-2 md:p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-2 text-[10px] md:text-xs">
                  Type <code className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] md:text-xs">DELETE</code> to confirm:
                </p>
                <input
                  type="text"
                  className={`w-full px-3 py-2 text-xs md:text-sm border rounded-lg focus:ring-2 outline-none ${
                    deleteConfirmation && deleteConfirmation !== "DELETE" 
                      ? "border-red-500 focus:ring-red-200" 
                      : deleteConfirmation === "DELETE" 
                        ? "border-emerald-500 focus:ring-emerald-200" 
                        : "border-gray-300 focus:ring-red-200 focus:border-red-400"
                  }`}
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  disabled={isDeleting}
                  autoComplete="off"
                />
                {deleteConfirmation && deleteConfirmation !== "DELETE" && (
                  <p className="text-red-500 text-[10px] md:text-xs mt-1">
                    Please type "DELETE" exactly as shown above.
                  </p>
                )}
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
                <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{prediction.userId?.substring(0, 12)}...</code>
              </small>
              <div className="d-flex w-100 gap-2" style={{ gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleClose} 
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
                  disabled={!isDeleteEnabled}
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

export default DeletePredictionModal;
