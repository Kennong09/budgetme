import React, { FC, useState, useEffect } from "react";
import { Budget, Category, BudgetUser } from "./types";

interface AddBudgetModalProps {
  show: boolean;
  onClose: () => void;
  onAdd: (budgetData: Partial<Budget>) => void;
  categories: Category[];
  users: BudgetUser[];
  loading?: boolean;
}

const AddBudgetModal: FC<AddBudgetModalProps> = ({
  show,
  onClose,
  onAdd,
  categories,
  users,
  loading = false
}) => {
  const [budgetData, setBudgetData] = useState<Partial<Budget>>({
    name: "",
    category: "",
    amount: 0,
    start_date: "",
    end_date: "",
    user_id: "",
    status: "active"
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [userSearch, setUserSearch] = useState<string>("");
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  useEffect(() => {
    if (show) {
      // Reset form when modal opens
      setBudgetData({
        name: "",
        category: "",
        amount: 0,
        start_date: "",
        end_date: "",
        user_id: "",
        status: "active"
      });
      setFormErrors({});
      setUserSearch("");
      setShowUserDropdown(false);
    }
  }, [show]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.position-relative')) {
          setShowUserDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);

  const handleInputChange = (field: keyof Budget, value: string | number) => {
    setBudgetData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!budgetData.name?.trim()) {
      errors.name = "Budget name is required";
    }

    if (!budgetData.category) {
      errors.category = "Category is required";
    }

    if (!budgetData.amount || budgetData.amount <= 0) {
      errors.amount = "Amount must be greater than 0";
    }

    if (!budgetData.start_date) {
      errors.start_date = "Start date is required";
    }

    if (!budgetData.end_date) {
      errors.end_date = "End date is required";
    }

    if (!budgetData.user_id) {
      errors.user_id = "User is required";
    }

    if (budgetData.start_date && budgetData.end_date && 
        new Date(budgetData.start_date) >= new Date(budgetData.end_date)) {
      errors.end_date = "End date must be after start date";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onAdd(budgetData);
    }
  };

  const handleUserSelect = (user: BudgetUser) => {
    setBudgetData(prev => ({
      ...prev,
      user_id: user.id
    }));
    setUserSearch(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User');
    setShowUserDropdown(false);
    
    // Clear error when user is selected
    if (formErrors.user_id) {
      setFormErrors(prev => ({
        ...prev,
        user_id: ""
      }));
    }
  };

  const handleClose = () => {
    setBudgetData({
      name: "",
      category: "",
      amount: 0,
      start_date: "",
      end_date: "",
      user_id: "",
      status: "active"
    });
    setFormErrors({});
    setUserSearch("");
    setShowUserDropdown(false);
    onClose();
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const searchLower = userSearch.toLowerCase();
    const fullName = user.user_metadata?.full_name?.toLowerCase() || '';
    const email = user.email?.toLowerCase() || '';
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  const selectedUser = users.find(u => u.id === budgetData.user_id);

  // Calculate days until budget starts (if start date is set)
  const getDaysInfo = () => {
    if (!budgetData.start_date || !budgetData.end_date) return null;
    const start = new Date(budgetData.start_date);
    const end = new Date(budgetData.end_date);
    const today = new Date();
    const daysUntilStart = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return { daysUntilStart, duration };
  };

  const daysInfo = getDaysInfo();

  if (!show) return null;

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
                  <i className="fas fa-plus-circle fa-lg"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-0 font-weight-bold">Create New Budget</h6>
                  <small style={{ opacity: 0.9 }}>Set spending limits and track expenses</small>
                </div>
                <button type="button" className="btn btn-light btn-sm" onClick={handleClose} disabled={loading}
                        style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Quick Stats Bar - Shows form progress - Desktop */}
            <div className="d-none d-md-block px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="row text-center g-2">
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas fa-signature mr-2 ${budgetData.name ? 'text-success' : 'text-muted'}`}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Name</small>
                      <strong className={budgetData.name ? 'text-success' : 'text-muted'} style={{ fontSize: '0.8rem' }}>
                        {budgetData.name ? '✓ Set' : 'Required'}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas fa-peso-sign mr-2 ${budgetData.amount && budgetData.amount > 0 ? 'text-success' : 'text-muted'}`}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Amount</small>
                      <strong className={budgetData.amount && budgetData.amount > 0 ? 'text-success' : 'text-muted'} style={{ fontSize: '0.8rem' }}>
                        {budgetData.amount && budgetData.amount > 0 ? `₱${budgetData.amount.toLocaleString()}` : 'Required'}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas fa-calendar mr-2 ${daysInfo ? 'text-success' : 'text-muted'}`}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Duration</small>
                      <strong className={daysInfo ? 'text-success' : 'text-muted'} style={{ fontSize: '0.8rem' }}>
                        {daysInfo ? `${daysInfo.duration} days` : 'Required'}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className={`fas fa-user mr-2 ${budgetData.user_id ? 'text-success' : 'text-muted'}`}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>User</small>
                      <strong className={budgetData.user_id ? 'text-success' : 'text-muted'} style={{ fontSize: '0.8rem' }}>
                        {budgetData.user_id ? '✓ Assigned' : 'Required'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Bar - Mobile */}
            <div className="d-block d-md-none px-2 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="d-flex justify-content-between">
                <div className="text-center flex-fill">
                  <i className={`fas fa-signature ${budgetData.name ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}></i>
                  <div className={`${budgetData.name ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.6rem' }}>
                    {budgetData.name ? '✓' : '○'}
                  </div>
                </div>
                <div className="text-center flex-fill">
                  <i className={`fas fa-peso-sign ${budgetData.amount && budgetData.amount > 0 ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}></i>
                  <div className={`${budgetData.amount && budgetData.amount > 0 ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.6rem' }}>
                    {budgetData.amount && budgetData.amount > 0 ? '✓' : '○'}
                  </div>
                </div>
                <div className="text-center flex-fill">
                  <i className={`fas fa-calendar ${daysInfo ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}></i>
                  <div className={`${daysInfo ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.6rem' }}>
                    {daysInfo ? '✓' : '○'}
                  </div>
                </div>
                <div className="text-center flex-fill">
                  <i className={`fas fa-user ${budgetData.user_id ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}></i>
                  <div className={`${budgetData.user_id ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.6rem' }}>
                    {budgetData.user_id ? '✓' : '○'}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Modal Body - Compact */}
              <div className="modal-body py-3" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                
                {/* Budget Details Section */}
                <div className="row mb-3">
                  <div className="col-lg-6">
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-info-circle mr-2"></i>Budget Details
                    </h6>
                    <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      <div className="form-group mb-3">
                        <label className="small text-muted mb-1">Budget Name *</label>
                        <input
                          type="text"
                          className={`form-control form-control-sm ${formErrors.name ? 'is-invalid' : ''}`}
                          placeholder="e.g., Monthly Groceries"
                          value={budgetData.name || ""}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          maxLength={100}
                          disabled={loading}
                          style={{ borderRadius: '6px' }}
                        />
                        {formErrors.name && <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{formErrors.name}</div>}
                      </div>
                      
                      <div className="form-group mb-0">
                        <label className="small text-muted mb-1">Category *</label>
                        <select
                          className={`form-control form-control-sm ${formErrors.category ? 'is-invalid' : ''}`}
                          value={budgetData.category || ""}
                          onChange={(e) => handleInputChange("category", e.target.value)}
                          disabled={loading}
                          style={{ borderRadius: '6px' }}
                        >
                          <option value="">Select Category</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.category_name}>
                              {category.category_name}
                            </option>
                          ))}
                        </select>
                        {formErrors.category && <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{formErrors.category}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-peso-sign mr-2"></i>Budget Amount
                    </h6>
                    <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      <div className="form-group mb-0">
                        <label className="small text-muted mb-1">Amount (PHP) *</label>
                        <div className="input-group input-group-sm">
                          <div className="input-group-prepend">
                            <span className="input-group-text" style={{ borderRadius: '6px 0 0 6px' }}>₱</span>
                          </div>
                          <input
                            type="number"
                            className={`form-control ${formErrors.amount ? 'is-invalid' : ''}`}
                            placeholder="0.00"
                            value={budgetData.amount || ""}
                            onChange={(e) => handleInputChange("amount", parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            disabled={loading}
                            style={{ borderRadius: '0 6px 6px 0' }}
                          />
                          {formErrors.amount && <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{formErrors.amount}</div>}
                        </div>
                        <small className="text-muted mt-1 d-block" style={{ fontSize: '0.7rem' }}>
                          <i className="fas fa-info-circle mr-1"></i>
                          Enter the maximum spending limit for this budget
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Section */}
                <div className="mb-3">
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                    <i className="fas fa-calendar-alt mr-2"></i>Budget Timeline
                  </h6>
                  <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group mb-md-0 mb-3">
                          <label className="small text-muted mb-1">Start Date *</label>
                          <input
                            type="date"
                            className={`form-control form-control-sm ${formErrors.start_date ? 'is-invalid' : ''}`}
                            value={budgetData.start_date || ""}
                            onChange={(e) => handleInputChange("start_date", e.target.value)}
                            disabled={loading}
                            style={{ borderRadius: '6px' }}
                          />
                          {formErrors.start_date && <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{formErrors.start_date}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group mb-0">
                          <label className="small text-muted mb-1">End Date *</label>
                          <input
                            type="date"
                            className={`form-control form-control-sm ${formErrors.end_date ? 'is-invalid' : ''}`}
                            value={budgetData.end_date || ""}
                            onChange={(e) => handleInputChange("end_date", e.target.value)}
                            disabled={loading}
                            style={{ borderRadius: '6px' }}
                          />
                          {formErrors.end_date && <div className="invalid-feedback" style={{ fontSize: '0.75rem' }}>{formErrors.end_date}</div>}
                        </div>
                      </div>
                    </div>
                    {daysInfo && (
                      <div className="mt-2 pt-2" style={{ borderTop: '1px solid #e9ecef' }}>
                        <div className="d-flex justify-content-between">
                          <small className="text-muted">
                            <i className="fas fa-clock mr-1"></i>
                            {daysInfo.daysUntilStart > 0 ? `Starts in ${daysInfo.daysUntilStart} days` : 
                             daysInfo.daysUntilStart === 0 ? 'Starts today' : 'Already started'}
                          </small>
                          <small className="text-muted">
                            <i className="fas fa-hourglass-half mr-1"></i>
                            Duration: {daysInfo.duration} days
                          </small>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Assignment Section */}
                <div>
                  <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                    <i className="fas fa-user-plus mr-2"></i>Assign to User
                  </h6>
                  <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                    <div className="form-group mb-2">
                      <label className="small text-muted mb-1">Search User *</label>
                      <div className="position-relative">
                        <input
                          type="text"
                          className={`form-control form-control-sm ${formErrors.user_id ? 'is-invalid' : ''}`}
                          placeholder="Type to search users..."
                          value={userSearch}
                          onChange={(e) => {
                            setUserSearch(e.target.value);
                            setShowUserDropdown(true);
                          }}
                          onFocus={() => setShowUserDropdown(true)}
                          disabled={loading}
                          style={{ borderRadius: '6px' }}
                        />
                        {showUserDropdown && filteredUsers.length > 0 && (
                          <div 
                            className="dropdown-menu show w-100" 
                            style={{ maxHeight: '150px', overflowY: 'auto', position: 'absolute', zIndex: 1000, borderRadius: '6px' }}
                          >
                            {filteredUsers.slice(0, 5).map(user => (
                              <button
                                key={user.id}
                                type="button"
                                className="dropdown-item d-flex align-items-center py-2"
                                onClick={() => handleUserSelect(user)}
                              >
                                <img
                                  src={user.user_metadata?.avatar_url || "../images/placeholder.png"}
                                  alt="Avatar"
                                  className="rounded-circle mr-2"
                                  style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                                  onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                                />
                                <div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown'}
                                  </div>
                                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>{user.email}</small>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {formErrors.user_id && <div className="invalid-feedback d-block" style={{ fontSize: '0.75rem' }}>{formErrors.user_id}</div>}
                      </div>
                    </div>
                    
                    {selectedUser && (
                      <div className="d-flex align-items-center p-2 mt-2" style={{ background: '#d4edda', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
                        <img
                          src={selectedUser.user_metadata?.avatar_url || "../images/placeholder.png"}
                          alt="Avatar"
                          className="rounded-circle mr-2"
                          style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                        />
                        <div className="flex-grow-1">
                          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            {selectedUser.user_metadata?.full_name || selectedUser.email?.split('@')[0] || 'Unknown'}
                          </div>
                          <small className="text-muted" style={{ fontSize: '0.7rem' }}>{selectedUser.email}</small>
                        </div>
                        <i className="fas fa-check-circle text-success"></i>
                      </div>
                    )}
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
                  <i className="fas fa-info-circle mr-1"></i>{budgetData.name && budgetData.user_id && budgetData.amount ? 'Ready to create budget' : 'Complete all required fields'}
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
                    type="submit" 
                    className="btn btn-danger" 
                    disabled={loading}
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
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddBudgetModal;
