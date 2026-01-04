import React, { FC, useState, useEffect } from "react";
import { AccountFormData, AccountUser, ACCOUNT_TYPE_CONFIGS, ACCOUNT_COLORS } from "./types";
import { getCurrencySymbol } from "../../settings/utils/currencyHelpers";

interface AddAccountModalProps {
  show: boolean;
  onClose: () => void;
  onAdd: (accountData: AccountFormData) => Promise<boolean>;
  users: AccountUser[];
  loading?: boolean;
}

const AddAccountModal: FC<AddAccountModalProps> = ({
  show,
  onClose,
  onAdd,
  users,
  loading = false
}) => {
  const [formData, setFormData] = useState<AccountFormData>({
    account_name: "",
    account_type: "checking" as any,
    balance: 0,
    initial_balance: 0,
    currency: "PHP",
    status: "active" as any,
    is_default: false,
    description: "",
    institution_name: "",
    account_number_masked: "",
    color: ACCOUNT_COLORS[0],
    user_id: "",
    admin_notes: ""
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState<string>("");
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  const currencySymbol = getCurrencySymbol('PHP');

  // Reset form when modal opens
  useEffect(() => {
    if (show) {
      setFormData({
        account_name: "",
        account_type: "checking",
        balance: 0,
        initial_balance: 0,
        currency: "PHP",
        status: "active",
        is_default: false,
        description: "",
        institution_name: "",
        account_number_masked: "",
        color: ACCOUNT_COLORS[0],
        user_id: "",
        admin_notes: ""
      });
      setErrors({});
      setUserSearch("");
      setShowUserDropdown(false);
    }
  }, [show]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.user-dropdown-container') && !target.closest('.input-group')) {
          setShowUserDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Account name validation
    if (!formData.account_name.trim()) {
      newErrors.account_name = "Account name is required";
    } else if (formData.account_name.length < 2) {
      newErrors.account_name = "Account name must be at least 2 characters";
    }

    // User validation
    if (!formData.user_id) {
      newErrors.user_id = "Please select an account owner";
    }

    // Balance validation
    if (isNaN(formData.balance)) {
      newErrors.balance = "Please enter a valid balance amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof AccountFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleUserSelect = (user: AccountUser) => {
    setFormData(prev => ({ ...prev, user_id: user.id }));
    setUserSearch(user.user_metadata?.full_name || user.full_name || user.email);
    setShowUserDropdown(false);
    
    // Clear user error
    if (errors.user_id) {
      setErrors(prev => ({ ...prev, user_id: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const success = await onAdd(formData);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Error adding account:', error);
    } finally {
      setSaving(false);
    }
  };

  // Get filtered users for dropdown
  const filteredUsers = users.filter(user => {
    const searchLower = userSearch.toLowerCase();
    const name = user.user_metadata?.full_name || user.full_name || "";
    const email = user.email || "";
    return name.toLowerCase().includes(searchLower) || 
           email.toLowerCase().includes(searchLower);
  });

  // Get selected user
  const selectedUser = users.find(user => user.id === formData.user_id);

  // Get account type config
  const typeConfig = ACCOUNT_TYPE_CONFIGS.find(config => config.value === formData.account_type) || ACCOUNT_TYPE_CONFIGS[0];

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !saving) {
      onClose();
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={onClose}>
        <div 
          className="modal-dialog modal-md modal-dialog-centered" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: 'auto', maxWidth: '500px', width: 'calc(100% - 16px)' }}
        >
          <div 
            className="modal-content border-0 shadow-lg" 
            style={{ borderRadius: '16px', overflow: 'hidden', maxHeight: '90vh', margin: '8px' }}
          >
            
            {/* Header - Mobile Responsive */}
            <div 
              className="modal-header border-0 text-white" 
              style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', padding: '12px 16px' }}
            >
              <div className="d-flex align-items-center w-100">
                <div 
                  className="d-flex align-items-center justify-content-center flex-shrink-0" 
                  style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', marginRight: '10px' }}
                >
                  <i className="fas fa-plus-circle" style={{ fontSize: '16px' }}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold" style={{ fontSize: '14px' }}>Add Account</h6>
                  <small className="d-none d-sm-block" style={{ opacity: 0.9, fontSize: '11px' }}>Create new financial account</small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={onClose} 
                  disabled={saving}
                  style={{ width: '30px', height: '30px', borderRadius: '8px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <i className="fas fa-times text-danger" style={{ fontSize: '12px' }}></i>
                </button>
              </div>
            </div>

            {/* Body - Mobile Responsive */}
            <form onSubmit={handleSubmit}>
              <div 
                className="modal-body" 
                style={{ maxHeight: 'calc(90vh - 140px)', overflowY: 'auto', padding: '12px 16px', WebkitOverflowScrolling: 'touch' }}
              >
                
                {/* User Selection Section */}
                <div className="mb-3">
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                    <i className="fas fa-user mr-2"></i>Account Owner <span className="text-danger">*</span>
                  </h6>
                  <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                    <div className="position-relative user-dropdown-container">
                      <div className="input-group input-group-sm">
                        <div className="input-group-prepend">
                          <span className="input-group-text bg-white border-right-0"><i className="fas fa-search text-muted"></i></span>
                        </div>
                        <input
                          type="text"
                          className={`form-control border-left-0 ${errors.user_id ? 'is-invalid' : selectedUser ? 'is-valid' : ''}`}
                          placeholder="Search for a user..."
                          value={userSearch}
                          onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); if (formData.user_id) { setFormData(prev => ({ ...prev, user_id: "" })); } }}
                          onFocus={() => setShowUserDropdown(true)}
                          disabled={saving}
                          style={{ boxShadow: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                      {showUserDropdown && filteredUsers.length > 0 && (
                        <div className="dropdown-menu show w-100" style={{ maxHeight: '150px', overflowY: 'auto', position: 'absolute', zIndex: 1000 }}>
                          {filteredUsers.slice(0, 5).map(user => (
                            <button key={user.id} type="button" className="dropdown-item d-flex align-items-center py-2" onClick={() => handleUserSelect(user)}>
                              <img src={user.avatar_url || user.user_metadata?.avatar_url || "../images/placeholder.png"} alt="Avatar" className="rounded-circle mr-2" style={{ width: '28px', height: '28px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }} />
                              <div className="flex-grow-1">
                                <div style={{ fontSize: '0.85rem' }}>{user.user_metadata?.full_name || user.full_name || user.email.split('@')[0]}</div>
                                <small className="text-muted">{user.email}</small>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.user_id && <small className="text-danger mt-1 d-block">{errors.user_id}</small>}
                    {selectedUser && (
                      <div className="mt-2 p-2 d-flex align-items-center" style={{ background: 'white', borderRadius: '6px', border: '1px solid #28a745' }}>
                        <i className="fas fa-check-circle text-success mr-2"></i>
                        <span style={{ fontSize: '0.85rem' }}>{selectedUser.user_metadata?.full_name || selectedUser.full_name || selectedUser.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Details Section */}
                <div className="mb-3">
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                    <i className={`${typeConfig.icon} mr-2`}></i>Account Details
                  </h6>
                  <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                    <div className="row">
                      <div className="col-12 col-sm-8 mb-3">
                        <label className="mb-1" style={{ fontSize: '0.85rem' }}>Account Name <span className="text-danger">*</span></label>
                        <input type="text" className={`form-control form-control-sm ${errors.account_name ? 'is-invalid' : formData.account_name.trim() ? 'is-valid' : ''}`} placeholder="e.g., Primary Checking" value={formData.account_name} onChange={(e) => handleInputChange('account_name', e.target.value)} disabled={saving} style={{ fontSize: '0.85rem' }} />
                        {errors.account_name && <small className="text-danger">{errors.account_name}</small>}
                      </div>
                      <div className="col-12 col-sm-4 mb-3">
                        <label className="mb-1" style={{ fontSize: '0.85rem' }}>Account Type</label>
                        <select className="form-control form-control-sm" value={formData.account_type} onChange={(e) => handleInputChange('account_type', e.target.value)} disabled={saving} style={{ fontSize: '0.85rem' }}>
                          {ACCOUNT_TYPE_CONFIGS.map(config => (<option key={config.value} value={config.value}>{config.label}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-6 mb-3">
                        <label className="mb-1" style={{ fontSize: '0.85rem' }}>Initial Balance</label>
                        <div className="input-group input-group-sm">
                          <div className="input-group-prepend"><span className="input-group-text">{currencySymbol}</span></div>
                          <input type="number" step="0.01" className="form-control" placeholder="0.00" value={formData.balance} onChange={(e) => handleInputChange('balance', parseFloat(e.target.value) || 0)} disabled={saving} style={{ fontSize: '0.85rem' }} />
                        </div>
                      </div>
                      <div className="col-6 mb-3">
                        <label className="mb-1" style={{ fontSize: '0.85rem' }}>Status</label>
                        <select className="form-control form-control-sm" value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)} disabled={saving} style={{ fontSize: '0.85rem' }}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="mb-1" style={{ fontSize: '0.85rem' }}>Description</label>
                      <textarea className="form-control form-control-sm" rows={2} placeholder="Optional description..." value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} disabled={saving} style={{ fontSize: '0.85rem' }} />
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="isDefault" checked={formData.is_default} onChange={(e) => handleInputChange('is_default', e.target.checked)} disabled={saving} />
                      <label className="form-check-label" htmlFor="isDefault" style={{ fontSize: '0.85rem' }}>Set as default account</label>
                    </div>
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
                  <i className="fas fa-info-circle mr-1"></i>{formData.account_name.trim() && formData.user_id ? 'Ready to create account' : 'Complete all required fields'}
                </small>
                <div className="d-flex w-100 gap-2" style={{ gap: '8px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={onClose} 
                    disabled={saving}
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
                    className="btn btn-danger" 
                    disabled={saving || !formData.account_name.trim() || !formData.user_id}
                    style={{ 
                      flex: 1,
                      padding: '10px 16px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      minHeight: '42px'
                    }}
                  >
                    {saving ? (<><span className="spinner-border spinner-border-sm mr-1"></span>Creating...</>) : (<><i className="fas fa-plus mr-1"></i>Create</>)}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddAccountModal;