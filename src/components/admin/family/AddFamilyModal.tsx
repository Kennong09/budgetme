import React, { useState, FC, FormEvent, useEffect } from "react";
import { Badge } from "react-bootstrap";
import { useToast } from "../../../utils/ToastContext";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { AddFamilyFormData, FamilyUser } from "./types";

interface AddFamilyModalProps {
  show: boolean;
  onClose: () => void;
  onFamilyAdded: () => void;
  users: FamilyUser[];
}

const AddFamilyModal: FC<AddFamilyModalProps> = ({ show, onClose, onFamilyAdded, users }) => {
  const [formData, setFormData] = useState<AddFamilyFormData>({
    family_name: "",
    description: "",
    currency_pref: "PHP",
    is_public: false
  });
  const [selectedCreator, setSelectedCreator] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
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

    // Creator validation
    if (!selectedCreator) {
      newErrors.creator = "Please select a family creator";
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

  // Handle user selection (matching transaction pattern)
  const handleUserSelect = (user: FamilyUser) => {
    setSelectedCreator(user.id);
    setUserSearch("");
    setShowUserDropdown(false);
    setErrors(prev => ({
      ...prev,
      creator: ""
    }));
  };

  // Filter users based on search (matching transaction pattern)
  const filteredUsers = users.filter(user => {
    const searchLower = userSearch.toLowerCase();
    const fullName = user.user_metadata?.full_name?.toLowerCase() || '';
    const email = user.email.toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  // Get selected user for display
  const selectedUser = users.find(u => u.id === selectedCreator);

  // Close dropdown when clicking outside (matching transaction pattern)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.position-relative')) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available');
      }

      // Step 1: Create the family
      const { data: familyData, error: familyError } = await supabaseAdmin
        .from('families')
        .insert({
          family_name: formData.family_name.trim(),
          description: formData.description.trim() || null,
          created_by: selectedCreator,
          currency_pref: formData.currency_pref,
          is_public: formData.is_public,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (familyError) throw familyError;

      if (!familyData) {
        throw new Error("Failed to create family");
      }

      // Step 2: Add the creator as the first family member (admin role)
      const { error: memberError } = await supabaseAdmin
        .from('family_members')
        .insert({
          family_id: familyData.id,
          user_id: selectedCreator,
          role: 'admin',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (memberError) {
        // If member creation fails, cleanup the family
        await supabaseAdmin.from('families').delete().eq('id', familyData.id);
        throw memberError;
      }

      // Success!
      showSuccessToast(`Family "${formData.family_name}" created successfully!`);
      
      // Reset form
      setFormData({
        family_name: "",
        description: "",
        currency_pref: "PHP",
        is_public: false
      });
      setSelectedCreator("");
      
      // Close modal and refresh family list
      onFamilyAdded();
      onClose();

    } catch (error: any) {
      console.error('Error creating family:', error);
      showErrorToast(error.message || 'Failed to create family');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      setFormData({
        family_name: "",
        description: "",
        currency_pref: "PHP",
        is_public: false
      });
      setSelectedCreator("");
      setUserSearch("");
      setShowUserDropdown(false);
      setErrors({});
      onClose();
    }
  };

  if (!show) return null;

  const isFormValid = formData.family_name.trim() && selectedCreator;

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
                  <i className="fas fa-users" style={{ fontSize: '1rem' }}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-truncate" style={{ fontSize: '0.9rem' }}>Create Family Group</h6>
                  <small className="d-none d-md-block" style={{ opacity: 0.9, fontSize: '0.75rem' }}>Set up a new family for financial management</small>
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

              {/* Info Banner */}
              <div className="p-3 mb-3" style={{ background: '#e7f3ff', borderRadius: '8px', borderLeft: '3px solid #007bff' }}>
                <div className="d-flex align-items-start">
                  <i className="fas fa-info-circle text-primary mr-2 mt-1"></i>
                  <div>
                    <strong className="text-primary" style={{ fontSize: '0.9rem' }}>Family Administrator</strong>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                      The selected user will become the family administrator and be automatically added as the first member.
                    </p>
                  </div>
                </div>
              </div>

              {/* Family Information Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-home mr-2"></i>Family Information
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="row">
                    <div className="col-12 mb-2">
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
                    <div className="col-12">
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
              </div>

              {/* Family Creator Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-user-shield mr-2"></i>Family Creator
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <label className="mb-1" style={{ fontSize: '0.85rem' }}>
                    Select Administrator <span className="text-danger">*</span>
                  </label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className={`form-control form-control-sm ${errors.creator ? 'is-invalid' : ''}`}
                      placeholder="Search for a user..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      disabled={loading}
                      style={{ fontSize: '0.85rem' }}
                    />
                    {showUserDropdown && filteredUsers.length > 0 && (
                      <div 
                        className="dropdown-menu show w-100" 
                        style={{ maxHeight: '150px', overflowY: 'auto', position: 'absolute', zIndex: 1000 }}
                      >
                        {filteredUsers.slice(0, 5).map(user => (
                          <button
                            key={user.id}
                            type="button"
                            className="dropdown-item d-flex align-items-center py-2"
                            onClick={() => handleUserSelect(user)}
                            style={{ fontSize: '0.85rem' }}
                          >
                            <img
                              src={user.user_metadata?.avatar_url || "../images/placeholder.png"}
                              alt="Avatar"
                              className="rounded-circle mr-2"
                              style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                            />
                            <div>
                              <strong>{user.user_metadata?.full_name || user.email.split('@')[0]}</strong>
                              <br />
                              <small className="text-muted">{user.email}</small>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected User Display */}
                  {selectedUser && (
                    <div className="mt-2 p-2 d-flex align-items-center" style={{ background: '#d4edda', borderRadius: '6px' }}>
                      <img
                        src={selectedUser.user_metadata?.avatar_url || "../images/placeholder.png"}
                        alt="Selected User"
                        className="rounded-circle mr-2"
                        style={{ width: '32px', height: '32px', objectFit: 'cover', border: '2px solid #28a745' }}
                        onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                      />
                      <div className="flex-grow-1">
                        <strong style={{ fontSize: '0.85rem' }}>{selectedUser.user_metadata?.full_name || selectedUser.email.split('@')[0]}</strong>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{selectedUser.email}</div>
                      </div>
                      <Badge bg="success" style={{ fontSize: '0.65rem' }}>
                        <i className="fas fa-check mr-1"></i>Selected
                      </Badge>
                    </div>
                  )}
                  {errors.creator && (
                    <div className="text-danger mt-1" style={{ fontSize: '0.75rem' }}>
                      <i className="fas fa-exclamation-circle mr-1"></i>{errors.creator}
                    </div>
                  )}
                </div>
              </div>

              {/* Settings Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-cog mr-2"></i>Family Settings
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="row">
                    <div className="col-6">
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
                    <div className="col-6">
                      <label className="mb-1" style={{ fontSize: '0.85rem' }}>Visibility</label>
                      <div className="p-2" style={{ background: '#fff', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                        <div className="form-check mb-0">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="is_public"
                            name="is_public"
                            checked={formData.is_public}
                            onChange={handleChange}
                            disabled={loading}
                          />
                          <label className="form-check-label" htmlFor="is_public" style={{ fontSize: '0.8rem' }}>
                            Make family public
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* What Will Be Created */}
              <div className="mb-0">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-list mr-2"></i>What will be created:
                </h6>
                <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
                  {[
                    { icon: 'fa-users', label: 'Family Group' },
                    { icon: 'fa-user-shield', label: 'Admin Member' },
                    { icon: 'fa-coins', label: 'Currency Settings' },
                    { icon: 'fa-share-alt', label: 'Sharing Access' }
                  ].map((item, i) => (
                    <span key={i} className="badge badge-light px-2 py-1" 
                          style={{ fontSize: '0.75rem', border: '1px solid #dee2e6' }}>
                      <i className={`fas ${item.icon} text-success mr-1`}></i>{item.label}
                    </span>
                  ))}
                </div>
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
              <small className="text-muted d-none d-sm-block" style={{ fontSize: '11px', flex: '1 1 100%', marginBottom: '4px' }}>
                <i className="fas fa-users mr-1"></i>{isFormValid ? 'Ready to create family' : 'Complete all required fields'}
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
                  disabled={loading || !isFormValid}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm mr-1"></span>Creating...</>
                  ) : (
                    <><i className="fas fa-plus mr-1"></i>Create</>
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

export default AddFamilyModal;
