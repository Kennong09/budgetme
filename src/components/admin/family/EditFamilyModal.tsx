import React, { useState, FC, FormEvent, useEffect } from "react";
import { Badge } from "react-bootstrap";
import { useToast } from "../../../utils/ToastContext";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { Family, EditFamilyFormData } from "./types";

interface EditFamilyModalProps {
  show: boolean;
  family: Family | null;
  onClose: () => void;
  onFamilyUpdated: (updatedFamily: Family) => void;
}

const EditFamilyModal: FC<EditFamilyModalProps> = ({ show, family, onClose, onFamilyUpdated }) => {
  const [formData, setFormData] = useState<EditFamilyFormData>({
    id: "",
    family_name: "",
    description: "",
    currency_pref: "PHP",
    is_public: false,
    status: "active"
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string>("");
  const { showSuccessToast, showErrorToast } = useToast();

  // Currency options
  const currencyOptions = [
    { value: "PHP", label: "Philippine Peso (PHP)" },
    { value: "USD", label: "US Dollar (USD)" },
    { value: "EUR", label: "Euro (EUR)" },
    { value: "GBP", label: "British Pound (GBP)" },
    { value: "JPY", label: "Japanese Yen (JPY)" },
    { value: "CAD", label: "Canadian Dollar (CAD)" },
    { value: "AUD", label: "Australian Dollar (AUD)" }
  ];

  // Populate form when family changes
  useEffect(() => {
    if (family) {
      setFormData({
        id: family.id,
        family_name: family.family_name,
        description: family.description || "",
        currency_pref: family.currency_pref,
        is_public: family.is_public,
        status: family.status
      });
      setErrors({});
    }
  }, [family]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Family name validation
    if (!formData.family_name.trim()) {
      newErrors.family_name = "Family name is required";
    } else if (formData.family_name.trim().length < 2) {
      newErrors.family_name = "Family name must be at least 2 characters";
    } else if (formData.family_name.trim().length > 50) {
      newErrors.family_name = "Family name must be less than 50 characters";
    }

    // Description validation
    if (formData.description && formData.description.length > 255) {
      newErrors.description = "Description must be less than 255 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !family) {
      return;
    }

    setLoading(true);

    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }

      // Update the family
      const { data: updatedFamily, error: updateError } = await supabaseAdmin
        .from('families')
        .update({
          family_name: formData.family_name.trim(),
          description: formData.description.trim() || null,
          currency_pref: formData.currency_pref,
          is_public: formData.is_public,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (!updatedFamily) {
        throw new Error("Failed to update family");
      }

      // Create updated family object with owner info preserved
      const updatedFamilyWithOwner: Family = {
        ...updatedFamily,
        members_count: family.members_count,
        owner: family.owner
      };

      // Success!
      showSuccessToast(`Family "${formData.family_name}" updated successfully!`);
      
      // Notify parent component
      onFamilyUpdated(updatedFamilyWithOwner);
      onClose();

    } catch (error: any) {
      console.error('Error updating family:', error);
      showErrorToast(error.message || 'Failed to update family');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      setErrors({});
      onClose();
    }
  };

  if (!show || !family) return null;

  const hasChanges = 
    formData.family_name !== family.family_name ||
    formData.description !== (family.description || "") ||
    formData.currency_pref !== family.currency_pref ||
    formData.is_public !== family.is_public ||
    formData.status !== family.status;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={handleClose}>
        <div className="modal-dialog modal-md modal-dialog-centered mx-2 mx-md-auto" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '90vh' }}>
            
            {/* Header */}
            <div className="modal-header border-0 text-white py-2 py-md-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
              <div className="d-flex align-items-center w-100">
                <div className="d-flex align-items-center justify-content-center mr-2" 
                     style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                  <i className="fas fa-edit" style={{ fontSize: '1rem' }}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-truncate" style={{ fontSize: '0.9rem' }}>Edit Family Group</h6>
                  <small className="d-none d-md-block" style={{ opacity: 0.9, fontSize: '0.75rem' }}>Update family information and settings</small>
                </div>
                <button type="button" className="btn btn-light btn-sm flex-shrink-0" onClick={handleClose} disabled={loading}
                        style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body py-2 py-md-3 px-2 px-md-3" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              
              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-exclamation-circle mr-2"></i>{error}
                </div>
              )}

              {/* Family Owner Summary Card */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <div className="d-flex align-items-center">
                  <div className="position-relative mr-3">
                    <img 
                      src={family.owner?.avatar_url || "../images/placeholder.png"} 
                      alt={family.owner?.full_name || "Owner"} 
                      className="rounded-circle"
                      style={{ width: '50px', height: '50px', objectFit: 'cover', border: '2px solid #dc3545' }}
                      onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                    />
                  </div>
                  <div className="flex-grow-1">
                    <strong style={{ fontSize: '0.9rem' }}>{family.family_name}</strong>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Owner: {family.owner?.full_name || 'Unknown'} • {family.members_count || 0} members
                    </div>
                    <div className="mt-1">
                      <Badge bg={family.status === 'active' ? 'success' : 'secondary'} style={{ fontSize: '0.6rem' }} className="mr-1">
                        {family.status}
                      </Badge>
                      {hasChanges && (
                        <Badge bg="warning" style={{ fontSize: '0.6rem' }}>
                          <i className="fas fa-exclamation-circle mr-1"></i>Unsaved
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Family Information Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-home mr-2"></i>Family Information
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="form-group mb-3">
                    <label className="mb-1" style={{ fontSize: '0.85rem' }}>
                      Family Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${errors.family_name ? 'is-invalid' : ''}`}
                      name="family_name"
                      value={formData.family_name}
                      onChange={handleChange}
                      placeholder="The Johnson Family"
                      disabled={loading}
                      style={{ fontSize: '0.85rem' }}
                    />
                    {errors.family_name && (
                      <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{errors.family_name}</div>
                    )}
                  </div>
                  <div className="form-group mb-0">
                    <label className="mb-1" style={{ fontSize: '0.85rem' }}>
                      Description <Badge bg="secondary" className="ml-2" style={{ fontSize: '0.6rem' }}>Optional</Badge>
                    </label>
                    <textarea
                      className={`form-control form-control-sm ${errors.description ? 'is-invalid' : ''}`}
                      name="description"
                      rows={2}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Brief description of this family group..."
                      disabled={loading}
                      style={{ fontSize: '0.85rem' }}
                    />
                    {errors.description && (
                      <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{errors.description}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Settings Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-cog mr-2"></i>Family Settings
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="row">
                    <div className="col-6 mb-2">
                      <label className="mb-1" style={{ fontSize: '0.85rem' }}>
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control form-control-sm"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        disabled={loading}
                        style={{ fontSize: '0.85rem' }}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="col-6 mb-2">
                      <label className="mb-1" style={{ fontSize: '0.85rem' }}>
                        Currency <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control form-control-sm"
                        name="currency_pref"
                        value={formData.currency_pref}
                        onChange={handleChange}
                        disabled={loading}
                        style={{ fontSize: '0.85rem' }}
                      >
                        {currencyOptions.map(currency => (
                          <option key={currency.value} value={currency.value}>
                            {currency.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="mb-1" style={{ fontSize: '0.85rem' }}>Visibility</label>
                      <div className="p-2" style={{ background: '#fff', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                        <div className="form-check mb-0">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="is_public_edit"
                            name="is_public"
                            checked={formData.is_public}
                            onChange={handleChange}
                            disabled={loading}
                          />
                          <label className="form-check-label" htmlFor="is_public_edit" style={{ fontSize: '0.8rem' }}>
                            Make family public (visible to other users)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning Banner */}
              {hasChanges && (
                <div className="p-3 mb-0" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                  <div className="d-flex align-items-start">
                    <i className="fas fa-exclamation-triangle text-danger mr-2 mt-1"></i>
                    <div>
                      <strong className="text-danger" style={{ fontSize: '0.85rem' }}>Pending Changes</strong>
                      <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>
                        Your changes will affect {family.members_count || 0} member{(family.members_count || 0) !== 1 ? 's' : ''}. 
                        Status and visibility changes take effect immediately.
                      </p>
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
              <small className="text-muted d-none d-sm-block" style={{ fontSize: '11px', flex: '1 1 100%', marginBottom: '4px' }}>
                <i className="fas fa-info-circle mr-1"></i>{hasChanges ? 'You have unsaved changes' : 'No changes made'}
              </small>
              <div className="d-flex w-100 gap-2" style={{ gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleClose} 
                  disabled={loading}
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
                  disabled={loading || !hasChanges}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm mr-1"></span>Saving...</>
                  ) : (
                    <><i className="fas fa-save mr-1"></i>Save</>
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

export default EditFamilyModal;
