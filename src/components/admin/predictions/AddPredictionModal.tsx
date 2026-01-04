import { FC, useState } from "react";
import { PredictionFormData, PredictionUser } from "./types";

interface AddPredictionModalProps {
  show: boolean;
  onClose: () => void;
  onAdd: (predictionData: PredictionFormData) => Promise<void>;
  users: PredictionUser[];
  loading?: boolean;
}

const AddPredictionModal: FC<AddPredictionModalProps> = ({
  show,
  onClose,
  onAdd,
  users,
  loading = false
}) => {
  const [formData, setFormData] = useState<PredictionFormData>({
    user_id: "",
    timeframe: "monthly",
    confidence_score: 80
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSearch, setUserSearch] = useState<string>("");
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  const handleInputChange = (field: keyof PredictionFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.user_id) {
      newErrors.user_id = "Please select a user";
    }

    if (!formData.timeframe) {
      newErrors.timeframe = "Please select a prediction timeframe";
    }

    if (formData.confidence_score && (formData.confidence_score < 0 || formData.confidence_score > 100)) {
      newErrors.confidence_score = "Confidence score must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(formData);
      
      setFormData({
        user_id: "",
        timeframe: "monthly",
        confidence_score: 80
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Error adding prediction:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserSelect = (user: PredictionUser) => {
    setFormData(prev => ({ ...prev, user_id: user.id }));
    setUserSearch(user.user_metadata?.full_name || user.email);
    setShowUserDropdown(false);
    if (errors.user_id) {
      setErrors(prev => ({ ...prev, user_id: "" }));
    }
  };

  const handleClose = () => {
    setFormData({
      user_id: "",
      timeframe: "monthly",
      confidence_score: 80
    });
    setErrors({});
    setUserSearch("");
    setShowUserDropdown(false);
    onClose();
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const searchLower = userSearch.toLowerCase();
    const fullName = user.user_metadata?.full_name?.toLowerCase() || '';
    const email = user.email.toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  if (!show) return null;

  const selectedUser = users.find(u => u.id === formData.user_id);

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={handleClose}>
        <div 
          className="modal-dialog modal-dialog-centered modal-dialog-scrollable" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: '0 auto', maxWidth: window.innerWidth < 768 ? '95vw' : '500px' }}
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
                  <i className="fas fa-plus-circle"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-0 font-weight-bold text-sm md:text-base">Add New Prediction</h6>
                  <small className="hidden md:inline" style={{ opacity: 0.9 }}>Generate financial forecasts</small>
                </div>
                <button type="button" className="btn btn-light btn-sm" onClick={handleClose} disabled={isSubmitting}
                        style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Quick Stats Bar - Mobile Optimized */}
            <div className="px-2 md:px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="grid grid-cols-3 gap-1 md:gap-2 text-center">
                <div className="flex items-center justify-center">
                  <i className="fas fa-user text-red-500 mr-1 md:mr-2 text-[10px] md:text-sm"></i>
                  <div className="text-left">
                    <span className="text-gray-500 block text-[8px] md:text-[10px] leading-tight">User</span>
                    <strong className="text-red-500 text-[10px] md:text-xs truncate max-w-[60px] block">
                      {selectedUser ? (selectedUser.user_metadata?.full_name?.split(' ')[0] || 'Selected') : 'None'}
                    </strong>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <i className="fas fa-calendar text-red-500 mr-1 md:mr-2 text-[10px] md:text-sm"></i>
                  <div className="text-left">
                    <span className="text-gray-500 block text-[8px] md:text-[10px] leading-tight">Timeframe</span>
                    <strong className="text-red-500 text-[10px] md:text-xs capitalize">
                      {formData.timeframe || 'Not Set'}
                    </strong>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <i className="fas fa-bullseye text-red-500 mr-1 md:mr-2 text-[10px] md:text-sm"></i>
                  <div className="text-left">
                    <span className="text-gray-500 block text-[8px] md:text-[10px] leading-tight">Confidence</span>
                    <strong className="text-red-500 text-[10px] md:text-xs">{formData.confidence_score}%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body - Mobile Optimized */}
            <div className="modal-body py-2 md:py-3 px-2 md:px-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              
              {/* Info Banner - Hidden on very small screens */}
              <div className="hidden md:block p-3 mb-3" style={{ background: '#e7f3ff', borderRadius: '8px', borderLeft: '3px solid #007bff' }}>
                <div className="d-flex align-items-start">
                  <i className="fas fa-info-circle text-primary mr-2 mt-1"></i>
                  <div>
                    <strong className="text-primary" style={{ fontSize: '0.85rem' }}>Prophet Forecasting</strong>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                      Predictions are generated using the Prophet model and analyze historical transaction data for accurate forecasts.
                    </p>
                  </div>
                </div>
              </div>

              <form id="add-prediction-form" onSubmit={handleSubmit}>
                {/* User Selection */}
                <h6 className="text-red-500 mb-2 text-xs md:text-sm flex items-center">
                  <i className="fas fa-user mr-2"></i>Select User <span className="text-red-500">*</span>
                </h6>
                <div className="p-2 md:p-3 mb-3 bg-gray-50 rounded-lg">
                  <div className="position-relative mb-2">
                    <input 
                      type="text" 
                      className={`w-full px-3 py-2 text-xs md:text-sm border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none ${errors.user_id ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Search for a user..." 
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }} 
                      onFocus={() => setShowUserDropdown(true)}
                      disabled={loading || isSubmitting}
                    />
                    {showUserDropdown && filteredUsers.length > 0 && (
                      <div 
                        className="dropdown-menu show w-100" 
                        style={{ maxHeight: '150px', overflowY: 'auto', position: 'absolute', zIndex: 1000 }}
                      >
                        {filteredUsers.slice(0, 8).map(user => (
                          <button 
                            key={user.id} 
                            type="button" 
                            className="dropdown-item d-flex align-items-center py-2" 
                            onClick={() => handleUserSelect(user)}
                          >
                            <img 
                              src={user.user_metadata?.avatar_url || "../images/placeholder.png"} 
                              alt="" 
                              className="rounded-circle mr-2" 
                              style={{ width: '24px', height: '24px', objectFit: 'cover' }} 
                              onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }} 
                            />
                            <div>
                              <div style={{ fontSize: '0.8rem' }}>{user.user_metadata?.full_name || user.email.split('@')[0]}</div>
                              <small className="text-muted" style={{ fontSize: '0.7rem' }}>{user.email}</small>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedUser && (
                    <div className="d-flex align-items-center p-2" style={{ background: '#e8f5e9', borderRadius: '6px', border: '1px solid #c8e6c9' }}>
                      <img 
                        src={selectedUser.user_metadata?.avatar_url || "../images/placeholder.png"} 
                        alt="" 
                        className="rounded-circle mr-2" 
                        style={{ width: '32px', height: '32px', objectFit: 'cover' }} 
                        onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }} 
                      />
                      <div>
                        <div className="font-weight-bold text-success" style={{ fontSize: '0.8rem' }}>
                          <i className="fas fa-check-circle mr-1"></i>{selectedUser.user_metadata?.full_name || selectedUser.email.split('@')[0]}
                        </div>
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>{selectedUser.email}</small>
                      </div>
                    </div>
                  )}
                  {errors.user_id && (
                    <p className="text-red-500 text-[10px] md:text-xs mt-1">{errors.user_id}</p>
                  )}
                </div>

                {/* Configuration */}
                <h6 className="text-red-500 mb-2 text-xs md:text-sm flex items-center">
                  <i className="fas fa-cog mr-2"></i>Configuration
                </h6>
                <div className="p-2 md:p-3 mb-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="timeframe" className="block text-xs md:text-sm text-gray-700 mb-1">
                        Timeframe <span className="text-red-500">*</span>
                      </label>
                      <select
                        className={`w-full px-3 py-2 text-xs md:text-sm border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none ${errors.timeframe ? 'border-red-500' : 'border-gray-300'}`}
                        id="timeframe"
                        value={formData.timeframe}
                        onChange={(e) => handleInputChange('timeframe', e.target.value)}
                        disabled={loading || isSubmitting}
                      >
                        <option value="">Select...</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      {errors.timeframe && (
                        <p className="text-red-500 text-[10px] md:text-xs mt-1">{errors.timeframe}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="confidence_score" className="block text-xs md:text-sm text-gray-700 mb-1">
                        Confidence Score
                      </label>
                      <input
                        type="number"
                        className={`w-full px-3 py-2 text-xs md:text-sm border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none ${errors.confidence_score ? 'border-red-500' : 'border-gray-300'}`}
                        id="confidence_score"
                        min="0"
                        max="100"
                        value={formData.confidence_score || ""}
                        onChange={(e) => handleInputChange('confidence_score', Number(e.target.value))}
                        placeholder="0-100"
                        disabled={loading || isSubmitting}
                      />
                      {errors.confidence_score && (
                        <p className="text-red-500 text-[10px] md:text-xs mt-1">{errors.confidence_score}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* What happens next - Compact on mobile */}
                <div className="p-2 md:p-3 bg-red-50 rounded-lg border-l-3" style={{ borderLeft: '3px solid #dc3545' }}>
                  <h6 className="text-red-500 mb-2 text-[11px] md:text-sm flex items-center">
                    <i className="fas fa-lightbulb mr-2"></i>What Happens Next
                  </h6>
                  <div className="grid grid-cols-2 gap-1 text-[9px] md:text-xs">
                    <div className="flex items-start gap-1">
                      <i className="fas fa-check-circle text-emerald-500 mt-0.5 text-[8px] md:text-[10px]"></i>
                      <span className="text-gray-500">Prophet generates forecasts</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <i className="fas fa-check-circle text-emerald-500 mt-0.5 text-[8px] md:text-[10px]"></i>
                      <span className="text-gray-500">Auto-calculated confidence</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <i className="fas fa-check-circle text-emerald-500 mt-0.5 text-[8px] md:text-[10px]"></i>
                      <span className="text-gray-500">Historical data analyzed</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <i className="fas fa-check-circle text-emerald-500 mt-0.5 text-[8px] md:text-[10px]"></i>
                      <span className="text-gray-500">Real-time updates</span>
                    </div>
                  </div>
                </div>
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
                <i className="fas fa-info-circle mr-1"></i>{formData.user_id && formData.timeframe ? 'Ready to generate prediction' : 'Complete all required fields'}
              </small>
              <div className="d-flex w-100 gap-2" style={{ gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleClose} 
                  disabled={isSubmitting}
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
                  type="submit" 
                  form="add-prediction-form" 
                  className="btn btn-danger"
                  disabled={isSubmitting || loading}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-1"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus mr-1"></i>Create
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

export default AddPredictionModal;
