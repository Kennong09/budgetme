import React, { FC, useState, useEffect, FormEvent } from "react";
import { Badge } from "react-bootstrap";
import { SystemPromptModalProps, SystemPromptSetting } from "./types";

const SystemPromptModal: FC<SystemPromptModalProps> = ({
  show,
  onClose,
  prompt,
  onSave,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    prompt: "",
    version: "1.0"
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when prompt changes
  useEffect(() => {
    if (prompt) {
      setFormData({
        prompt: prompt.setting_value.prompt || "",
        version: prompt.setting_value.version || "1.0"
      });
      setHasChanges(false);
    } else {
      // Reset for new prompt
      setFormData({
        prompt: "You are a helpful financial assistant for BudgetMe. Help users with budgeting, financial planning, and money management questions.",
        version: "1.0"
      });
      setHasChanges(false);
    }
    setErrors({});
  }, [prompt, show]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setHasChanges(true);
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.prompt.trim()) {
      newErrors.prompt = "System prompt is required";
    } else if (formData.prompt.trim().length < 10) {
      newErrors.prompt = "Prompt must be at least 10 characters";
    }

    if (!formData.version.trim()) {
      newErrors.version = "Version is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const promptData: SystemPromptSetting = {
        id: prompt?.id,
        setting_key: 'chatbot_system_prompt',
        setting_value: {
          prompt: formData.prompt,
          version: formData.version,
          last_updated: new Date().toISOString()
        },
        setting_type: 'json',
        description: 'System prompt for AI chatbot',
        category: 'features',
        created_at: prompt?.created_at,
        updated_at: new Date().toISOString()
      };

      await onSave(promptData);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving prompt:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges && !saving) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!show) return null;

  const getPromptLengthStatus = () => {
    const len = formData.prompt.length;
    if (len === 0) return { label: 'Empty', color: '#6c757d', icon: 'fa-minus-circle' };
    if (len < 10) return { label: 'Too Short', color: '#dc3545', icon: 'fa-exclamation-circle' };
    if (len < 100) return { label: 'Short', color: '#fd7e14', icon: 'fa-exclamation-triangle' };
    if (len < 500) return { label: 'Good', color: '#28a745', icon: 'fa-check-circle' };
    return { label: 'Excellent', color: '#17a2b8', icon: 'fa-star' };
  };

  const lengthStatus = getPromptLengthStatus();
  const lastUpdated = prompt?.setting_value?.last_updated 
    ? new Date(prompt.setting_value.last_updated).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Never';

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={handleClose}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '85vh' }}>
            
            {/* Header - Compact */}
            <div className="modal-header border-0 text-white py-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
              <div className="d-flex align-items-center w-100">
                <div className="d-flex align-items-center justify-content-center mr-2" 
                     style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                  <i className="fas fa-cog fa-lg"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-0 font-weight-bold">
                    {loading ? "Loading..." : prompt ? "Configure System Prompt" : "System Prompt Configuration"}
                  </h6>
                  <small style={{ opacity: 0.9 }}>
                    {hasChanges ? (
                      <><i className="fas fa-exclamation-triangle mr-1"></i>Unsaved changes</>
                    ) : (
                      <>AI chatbot behavior settings</>
                    )}
                  </small>
                </div>
                <button type="button" className="btn btn-light btn-sm" onClick={handleClose} disabled={saving}
                        style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Quick Stats Bar - Compact */}
            <div className="px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="row text-center g-2">
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas ${lengthStatus.icon} mr-2`} style={{ color: lengthStatus.color }}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Length</small>
                      <strong style={{ color: lengthStatus.color, fontSize: '0.8rem' }}>{lengthStatus.label}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-text-width text-danger mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Characters</small>
                      <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{formData.prompt.length}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-tag text-danger mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Version</small>
                      <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{formData.version || '1.0'}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-calendar-alt text-danger mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Updated</small>
                      <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{lastUpdated}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body - Compact */}
            <div className="modal-body py-3" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-danger" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                  <p className="text-muted mt-2 mb-0">Loading prompt configuration...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} id="systemPromptForm">
                  {/* Prompt Field */}
                  <div className="mb-3">
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-comment-alt mr-2"></i>System Prompt <span className="text-danger">*</span>
                    </h6>
                    <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      <textarea
                        id="prompt"
                        name="prompt"
                        className={`form-control ${errors.prompt ? 'is-invalid' : ''}`}
                        rows={8}
                        value={formData.prompt}
                        onChange={handleChange}
                        placeholder="Enter the system prompt for the AI chatbot..."
                        disabled={saving}
                        style={{ fontSize: '0.85rem', borderRadius: '6px', resize: 'vertical' }}
                      />
                      {errors.prompt && (
                        <div className="invalid-feedback d-block mt-1" style={{ fontSize: '0.8rem' }}>
                          <i className="fas fa-exclamation-circle mr-1"></i>{errors.prompt}
                        </div>
                      )}
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                          <i className="fas fa-info-circle mr-1"></i>
                          Defines AI behavior for all conversations
                        </small>
                        <Badge bg={formData.prompt.length >= 500 ? 'info' : formData.prompt.length >= 100 ? 'success' : formData.prompt.length >= 10 ? 'warning' : 'secondary'}
                               style={{ fontSize: '0.65rem' }}>
                          {formData.prompt.length} chars
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Version & Info Row */}
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                        <i className="fas fa-tag mr-2"></i>Version <span className="text-danger">*</span>
                      </h6>
                      <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <input
                          type="text"
                          id="version"
                          name="version"
                          className={`form-control ${errors.version ? 'is-invalid' : ''}`}
                          value={formData.version}
                          onChange={handleChange}
                          placeholder="e.g., 1.0"
                          disabled={saving}
                          style={{ fontSize: '0.85rem', borderRadius: '6px' }}
                        />
                        {errors.version && (
                          <div className="invalid-feedback d-block mt-1" style={{ fontSize: '0.8rem' }}>
                            <i className="fas fa-exclamation-circle mr-1"></i>{errors.version}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-8 mb-3">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                        <i className="fas fa-lightbulb mr-2"></i>Writing Tips
                      </h6>
                      <div className="p-3" style={{ background: '#e7f6ff', borderRadius: '8px', borderLeft: '3px solid #17a2b8' }}>
                        <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
                          {[
                            { icon: 'fa-bullseye', label: 'Be specific' },
                            { icon: 'fa-border-all', label: 'Set boundaries' },
                            { icon: 'fa-comment-dots', label: 'Define tone' },
                            { icon: 'fa-flask', label: 'Test thoroughly' }
                          ].map((tip, i) => (
                            <Badge key={i} bg="light" className="text-muted" style={{ fontSize: '0.7rem', border: '1px solid #dee2e6' }}>
                              <i className={`fas ${tip.icon} text-info mr-1`}></i>{tip.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Configuration Summary */}
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                    <i className="fas fa-info-circle mr-2"></i>Configuration Info
                  </h6>
                  <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <div className="row">
                      <div className="col-6">
                        <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                          <small className="text-muted">Setting Key</small>
                          <code style={{ fontSize: '0.7rem' }}>chatbot_system_prompt</code>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <small className="text-muted">Category</small>
                          <Badge bg="primary" style={{ fontSize: '0.65rem' }}>Features</Badge>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                          <small className="text-muted">Type</small>
                          <Badge bg="secondary" style={{ fontSize: '0.65rem' }}>JSON</Badge>
                        </div>
                        <div className="d-flex justify-content-between py-1">
                          <small className="text-muted">Status</small>
                          <Badge bg={hasChanges ? 'warning' : 'success'} style={{ fontSize: '0.65rem' }}>
                            {hasChanges ? 'Modified' : 'Saved'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer - Compact */}
            <div className="modal-footer border-0 py-2" style={{ background: '#f8f9fa' }}>
              <small className="text-muted mr-auto" style={{ fontSize: '0.75rem' }}>
                {hasChanges && !saving ? (
                  <><i className="fas fa-exclamation-triangle text-warning mr-1"></i>Unsaved changes</>
                ) : prompt?.id ? (
                  <><i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '0.7rem' }}>{prompt.id?.substring(0, 12)}...</code></>
                ) : (
                  <><i className="fas fa-plus-circle text-info mr-1"></i>New configuration</>
                )}
              </small>
              <button type="button" className="btn btn-secondary btn-sm mr-2" onClick={handleClose} disabled={saving}>
                <i className="fas fa-times mr-1"></i>Cancel
              </button>
              <button type="submit" form="systemPromptForm" className="btn btn-danger btn-sm" disabled={saving || !hasChanges || loading}>
                {saving ? (
                  <><span className="spinner-border spinner-border-sm mr-1"></span>Saving...</>
                ) : (
                  <><i className="fas fa-save mr-1"></i>Save Prompt</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SystemPromptModal;
