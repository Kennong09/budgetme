import React, { FC, useState, useEffect } from "react";
import { AdminAccount, AccountFormData, AccountUser, ACCOUNT_TYPE_CONFIGS, ACCOUNT_COLORS } from "./types";
import { getCurrencySymbol } from "../../settings/utils/currencyHelpers";

interface EditAccountModalProps {
  show: boolean;
  onClose: () => void;
  onUpdate: (accountId: string, accountData: Partial<AccountFormData>) => Promise<boolean>;
  account: AdminAccount | null;
  users: AccountUser[];
  loading?: boolean;
}

const EditAccountModal: FC<EditAccountModalProps> = ({
  show,
  onClose,
  onUpdate,
  account,
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

  // Populate form when account changes
  useEffect(() => {
    if (show && account) {
      setFormData({
        account_name: account.account_name,
        account_type: account.account_type,
        balance: account.balance,
        initial_balance: account.initial_balance || account.balance,
        currency: account.currency || "PHP",
        status: account.status,
        is_default: account.is_default,
        description: account.description || "",
        institution_name: account.institution_name || "",
        account_number_masked: account.account_number_masked || "",
        color: account.color || ACCOUNT_COLORS[0],
        user_id: account.user_id,
        admin_notes: account.admin_notes || ""
      });

      // Set user search to current user
      const currentUser = users.find(user => user.id === account.user_id);
      setUserSearch(currentUser?.full_name || currentUser?.email || "");
      
      setErrors({});
      setShowUserDropdown(false);
    }
  }, [show, account, users]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.user-dropdown-container')) {
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

    // Credit account balance validation
    if (formData.account_type === 'credit' && formData.balance > 0) {
      newErrors.balance = "Credit account balance must be zero or negative (representing debt)";
    }

    // Account number validation (if provided)
    if (formData.account_number_masked && formData.account_number_masked.length < 4) {
      newErrors.account_number_masked = "Account number must be at least 4 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof AccountFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const handleUserSelect = (user: AccountUser) => {
    setFormData(prev => ({ ...prev, user_id: user.id }));
    setUserSearch(user.full_name || user.email);
    setShowUserDropdown(false);
    
    // Clear user selection error
    if (errors.user_id) {
      setErrors(prev => ({ ...prev, user_id: "" }));
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = userSearch.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const selectedUser = users.find(user => user.id === formData.user_id);
  const typeConfig = ACCOUNT_TYPE_CONFIGS.find(config => config.value === formData.account_type) || ACCOUNT_TYPE_CONFIGS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account || !validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const success = await onUpdate(account.id!, formData);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Error updating account:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !saving) {
      onClose();
    }
  };

  if (!show || !account) return null;

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
                  <i className="fas fa-edit" style={{ fontSize: '16px' }}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold" style={{ fontSize: '14px' }}>Edit Account</h6>
                  <small className="d-none d-sm-block text-truncate" style={{ opacity: 0.9, fontSize: '11px' }}>{account?.account_name}</small>
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
                
                {/* Current Account Info Bar */}
                <div className="mb-3 p-2 d-flex align-items-center" style={{ background: '#fff5f5', borderRadius: '8px', borderLeft: '3px solid #dc3545' }}>
                  <div className="d-flex align-items-center justify-content-center mr-2" style={{ width: '32px', height: '32px', backgroundColor: account.color || typeConfig.color + '20', borderRadius: '6px' }}>
                    <i className={typeConfig.icon} style={{ color: account.color || typeConfig.color, fontSize: '0.9rem' }}></i>
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Current Account</small>
                    <strong className="text-truncate d-block" style={{ fontSize: '0.85rem' }}>{account.account_name}</strong>
                  </div>
                </div>

                {/* Account Owner Section */}
                <div className="mb-3">
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}><i className="fas fa-user mr-2"></i>Account Owner <span className="text-danger">*</span></h6>
                  <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                    <div className="position-relative user-dropdown-container">
                      <input type="text" className={`form-control form-control-sm ${errors.user_id ? 'is-invalid' : selectedUser ? 'is-valid' : ''}`} placeholder="Search for user..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); if (formData.user_id) { setFormData(prev => ({ ...prev, user_id: "" })); } }} onFocus={() => setShowUserDropdown(true)} disabled={saving} style={{ fontSize: '0.85rem' }} />
                      {showUserDropdown && filteredUsers.length > 0 && (
                        <div className="dropdown-menu show w-100" style={{ maxHeight: '150px', overflowY: 'auto', position: 'absolute', zIndex: 1000 }}>
                          {filteredUsers.slice(0, 5).map(user => (
                            <button key={user.id} type="button" className="dropdown-item d-flex align-items-center py-2" onClick={() => handleUserSelect(user)}>
                              <div className="rounded-circle d-flex align-items-center justify-content-center mr-2" style={{ width: '24px', height: '24px', backgroundColor: '#dc354520', color: '#dc3545' }}>
                                <i className="fas fa-user" style={{ fontSize: '10px' }}></i>
                              </div>
                              <div><div style={{ fontSize: '0.85rem' }}>{user.full_name || 'Unknown'}</div><small className="text-muted">{user.email}</small></div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.user_id && <small className="text-danger">{errors.user_id}</small>}
                    {selectedUser && (
                      <div className="mt-2 p-2 d-flex align-items-center" style={{ background: 'white', borderRadius: '6px', border: '1px solid #28a745' }}>
                        <i className="fas fa-check-circle text-success mr-2"></i>
                        <span style={{ fontSize: '0.85rem' }}>{selectedUser.full_name || selectedUser.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Details Section */}
                <div className="mb-3">
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}><i className={`${typeConfig.icon} mr-2`}></i>Account Details</h6>
                  <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                    <div className="row">
                      <div className="col-12 col-sm-8 mb-3">
                        <label className="mb-1" style={{ fontSize: '0.85rem' }}>Account Name <span className="text-danger">*</span></label>
                        <input type="text" className={`form-control form-control-sm ${errors.account_name ? 'is-invalid' : formData.account_name.trim() ? 'is-valid' : ''}`} placeholder="e.g., Primary Checking" value={formData.account_name} onChange={(e) => handleInputChange('account_name', e.target.value)} disabled={saving} style={{ fontSize: '0.85rem' }} />
                        {errors.account_name && <small className="text-danger">{errors.account_name}</small>}
                      </div>
                      <div className="col-12 col-sm-4 mb-3">
                        <label className="mb-1" style={{ fontSize: '0.85rem' }}>Type</label>
                        <select className="form-control form-control-sm" value={formData.account_type} onChange={(e) => handleInputChange('account_type', e.target.value)} disabled={saving} style={{ fontSize: '0.85rem' }}>
                          {ACCOUNT_TYPE_CONFIGS.map(config => (<option key={config.value} value={config.value}>{config.label}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-6 mb-3">
                        <label className="mb-1" style={{ fontSize: '0.85rem' }}>Balance <span className="text-danger">*</span></label>
                        <div className="input-group input-group-sm">
                          <div className="input-group-prepend"><span className="input-group-text">{currencySymbol}</span></div>
                          <input type="number" step="0.01" className={`form-control ${errors.balance ? 'is-invalid' : ''}`} placeholder="0.00" value={formData.balance} onChange={(e) => handleInputChange('balance', parseFloat(e.target.value) || 0)} disabled={saving} style={{ fontSize: '0.85rem' }} />
                        </div>
                        {errors.balance && <small className="text-danger">{errors.balance}</small>}
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
                      <label className="mb-1" style={{ fontSize: '0.85rem' }}>Account Color</label>
                      <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
                        {ACCOUNT_COLORS.map((color: string) => (
                          <div key={color} onClick={() => handleInputChange('color', color)} style={{ width: '24px', height: '24px', backgroundColor: color, borderRadius: '4px', cursor: 'pointer', border: formData.color === color ? '2px solid #333' : '1px solid #ddd' }} title={color} />
                        ))}
                      </div>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="is_default" checked={formData.is_default} onChange={(e) => handleInputChange('is_default', e.target.checked)} disabled={saving} />
                      <label className="form-check-label" htmlFor="is_default" style={{ fontSize: '0.85rem' }}>Set as default account</label>
                    </div>
                  </div>
                </div>

                {/* Optional Information Section */}
                <div className="mb-3">
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}><i className="fas fa-info-circle mr-2"></i>Optional Information</h6>
                  <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                    <div className="row">
                      <div className="col-6 mb-2">
                        <label className="mb-1" style={{ fontSize: '0.85rem' }}>Institution</label>
                        <input type="text" className="form-control form-control-sm" placeholder="Bank name..." value={formData.institution_name} onChange={(e) => handleInputChange('institution_name', e.target.value)} disabled={saving} style={{ fontSize: '0.85rem' }} />
                      </div>
                      <div className="col-6 mb-2">
                        <label className="mb-1" style={{ fontSize: '0.85rem' }}>Account #</label>
                        <input type="text" className="form-control form-control-sm" placeholder="1234" value={formData.account_number_masked} onChange={(e) => handleInputChange('account_number_masked', e.target.value)} maxLength={10} disabled={saving} style={{ fontSize: '0.85rem' }} />
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="mb-1" style={{ fontSize: '0.85rem' }}>Description</label>
                      <textarea className="form-control form-control-sm" rows={2} placeholder="Notes about this account..." value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} disabled={saving} style={{ fontSize: '0.85rem' }} />
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
                <small className="text-muted d-none d-sm-block" style={{ fontSize: '10px', flex: '1 1 100%', marginBottom: '4px' }}>
                  <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{account.id?.substring(0, 12)}...</code>
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
                    {saving ? (<><span className="spinner-border spinner-border-sm mr-1"></span>Updating...</>) : (<><i className="fas fa-save mr-1"></i>Update</>)}
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

export default EditAccountModal;
