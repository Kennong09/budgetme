import React, { FC, useState, useEffect } from "react";
import { Budget, Category, BudgetUser } from "./types";

interface EditBudgetModalProps {
  show: boolean;
  budget: Budget | null;
  onClose: () => void;
  onUpdate: (budgetId: string, budgetData: Partial<Budget>) => void;
  categories: Category[];
  users: BudgetUser[];
  loading?: boolean;
}

const EditBudgetModal: FC<EditBudgetModalProps> = ({
  show,
  budget,
  onClose,
  onUpdate,
  categories,
  users,
  loading = false
}) => {
  const [budgetData, setBudgetData] = useState<Partial<Budget>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [userSearch, setUserSearch] = useState<string>("");
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (show && budget) {
      // Initialize form with budget data
      setBudgetData({
        name: budget.name,
        category: budget.category,
        amount: budget.amount,
        start_date: budget.start_date,
        end_date: budget.end_date,
        user_id: budget.user_id,
        status: budget.status
      });
      setFormErrors({});
      setActiveTab("details");
      
      // Set initial search value to current user
      const currentUser = users.find(u => u.id === budget.user_id);
      setUserSearch(currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Unknown User');
      setShowUserDropdown(false);
    }
  }, [show, budget, users]);

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
    
    if (budget && validateForm()) {
      onUpdate(budget.id, budgetData);
    }
  };

  const handleClose = () => {
    setBudgetData({});
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

  // Calculate progress percentage
  const progressPercent = budget ? Math.min(Math.round((budget.spent / budget.amount) * 100), 100) : 0;
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return '#dc3545';
    if (percent >= 70) return '#fd7e14';
    return '#28a745';
  };

  if (!show || !budget) return null;

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
                  <i className="fas fa-edit fa-lg"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-0 font-weight-bold">Edit Budget</h6>
                  <small style={{ opacity: 0.9 }}>{budget.name}</small>
                </div>
                <button type="button" className="btn btn-light btn-sm" onClick={handleClose} disabled={loading}
                        style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Quick Stats Bar - Desktop */}
            <div className="d-none d-md-block px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="row text-center g-2">
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-peso-sign text-primary mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Budget</small>
                      <strong className="text-primary" style={{ fontSize: '0.8rem' }}>₱{budget.amount.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-receipt text-danger mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Spent</small>
                      <strong className="text-danger" style={{ fontSize: '0.8rem' }}>₱{budget.spent.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-wallet text-success mr-2"></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Remaining</small>
                      <strong className="text-success" style={{ fontSize: '0.8rem' }}>₱{(budget.amount - budget.spent).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-3">
                  <div className="d-flex align-items-center justify-content-center">
                    <i className="fas fa-chart-pie mr-2" style={{ color: getProgressColor(progressPercent) }}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Progress</small>
                      <strong style={{ color: getProgressColor(progressPercent), fontSize: '0.8rem' }}>{progressPercent}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Bar - Mobile */}
            <div className="d-block d-md-none px-2 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="d-flex justify-content-between text-center">
                <div className="flex-fill px-1">
                  <small className="text-muted d-block" style={{ fontSize: '0.55rem' }}>Budget</small>
                  <strong className="text-primary" style={{ fontSize: '0.65rem' }}>₱{budget.amount.toLocaleString()}</strong>
                </div>
                <div className="flex-fill px-1">
                  <small className="text-muted d-block" style={{ fontSize: '0.55rem' }}>Spent</small>
                  <strong className="text-danger" style={{ fontSize: '0.65rem' }}>₱{budget.spent.toLocaleString()}</strong>
                </div>
                <div className="flex-fill px-1">
                  <small className="text-muted d-block" style={{ fontSize: '0.55rem' }}>Left</small>
                  <strong className="text-success" style={{ fontSize: '0.65rem' }}>₱{(budget.amount - budget.spent).toLocaleString()}</strong>
                </div>
                <div className="flex-fill px-1">
                  <small className="text-muted d-block" style={{ fontSize: '0.55rem' }}>Progress</small>
                  <strong style={{ color: getProgressColor(progressPercent), fontSize: '0.65rem' }}>{progressPercent}%</strong>
                </div>
              </div>
            </div>

            {/* Tab Navigation - Desktop */}
            <div className="d-none d-md-block px-3 pt-2">
              <div className="d-flex" style={{ gap: '6px' }}>
                {[
                  { id: 'details', icon: 'fa-info-circle', label: 'Details' },
                  { id: 'financial', icon: 'fa-peso-sign', label: 'Financial' },
                  { id: 'timeline', icon: 'fa-calendar-alt', label: 'Timeline' },
                  { id: 'owner', icon: 'fa-user', label: 'Owner' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
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

            {/* Tab Navigation - Mobile */}
            <div className="d-block d-md-none px-2 pt-2">
              <div className="d-flex overflow-auto" style={{ gap: '4px' }}>
                {[
                  { id: 'details', icon: 'fa-info-circle', label: 'Details' },
                  { id: 'financial', icon: 'fa-peso-sign', label: 'Budget' },
                  { id: 'timeline', icon: 'fa-calendar-alt', label: 'Time' },
                  { id: 'owner', icon: 'fa-user', label: 'Owner' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`btn btn-sm ${activeTab === tab.id ? 'btn-danger' : 'btn-outline-secondary'}`}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ borderRadius: '12px', padding: '3px 8px', fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                  >
                    <i className={`fas ${tab.icon}`} style={{ marginRight: '2px' }}></i>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Modal Body - Compact */}
              <div className="modal-body py-3" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
                
                {/* Details Tab */}
                {activeTab === 'details' && (
                  <div className="row">
                    <div className="col-lg-6">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                        <i className="fas fa-signature mr-2"></i>Budget Name
                      </h6>
                      <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <div className="form-group mb-0">
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
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                        <i className="fas fa-tag mr-2"></i>Category
                      </h6>
                      <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
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

                    <div className="col-12">
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                        <i className="fas fa-flag mr-2"></i>Status
                      </h6>
                      <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <div className="d-flex" style={{ gap: '8px' }}>
                          {[
                            { value: 'active', label: 'Active', icon: 'fa-play-circle', color: '#28a745' },
                            { value: 'completed', label: 'Completed', icon: 'fa-check-circle', color: '#007bff' },
                            { value: 'archived', label: 'Archived', icon: 'fa-archive', color: '#6c757d' }
                          ].map(status => (
                            <button
                              key={status.value}
                              type="button"
                              className={`btn btn-sm flex-fill ${budgetData.status === status.value ? '' : 'btn-outline-secondary'}`}
                              style={{ 
                                borderRadius: '6px',
                                background: budgetData.status === status.value ? status.color : undefined,
                                borderColor: budgetData.status === status.value ? status.color : undefined,
                                color: budgetData.status === status.value ? 'white' : undefined
                              }}
                              onClick={() => handleInputChange("status", status.value)}
                              disabled={loading}
                            >
                              <i className={`fas ${status.icon} mr-1`}></i>
                              {status.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Tab */}
                {activeTab === 'financial' && (
                  <div>
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-peso-sign mr-2"></i>Budget Amount
                    </h6>
                    <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      <div className="form-group mb-3">
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
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="pt-2" style={{ borderTop: '1px solid #e9ecef' }}>
                        <div className="d-flex justify-content-between mb-1">
                          <small className="text-muted">Spending Progress</small>
                          <small style={{ color: getProgressColor(progressPercent) }}>{progressPercent}%</small>
                        </div>
                        <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
                          <div 
                            className="progress-bar"
                            style={{ width: `${progressPercent}%`, background: getProgressColor(progressPercent), borderRadius: '3px' }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-chart-bar mr-2"></i>Financial Summary
                    </h6>
                    <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      <div className="row text-center">
                        <div className="col-4">
                          <div className="p-2" style={{ background: 'rgba(0,123,255,0.1)', borderRadius: '6px' }}>
                            <small className="text-muted d-block">Budget</small>
                            <strong className="text-primary">₱{budget.amount.toLocaleString()}</strong>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="p-2" style={{ background: 'rgba(220,53,69,0.1)', borderRadius: '6px' }}>
                            <small className="text-muted d-block">Spent</small>
                            <strong className="text-danger">₱{budget.spent.toLocaleString()}</strong>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="p-2" style={{ background: 'rgba(40,167,69,0.1)', borderRadius: '6px' }}>
                            <small className="text-muted d-block">Remaining</small>
                            <strong className="text-success">₱{(budget.amount - budget.spent).toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline Tab */}
                {activeTab === 'timeline' && (
                  <div>
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-calendar-alt mr-2"></i>Budget Period
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
                      
                      {budgetData.start_date && budgetData.end_date && (
                        <div className="mt-3 pt-2" style={{ borderTop: '1px solid #e9ecef' }}>
                          <div className="d-flex justify-content-between">
                            <small className="text-muted">
                              <i className="fas fa-calendar-check mr-1"></i>
                              {new Date(budgetData.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </small>
                            <small className="text-muted">
                              <i className="fas fa-arrow-right mr-1"></i>
                              {Math.ceil((new Date(budgetData.end_date).getTime() - new Date(budgetData.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                            </small>
                            <small className="text-muted">
                              <i className="fas fa-calendar-times mr-1"></i>
                              {new Date(budgetData.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </small>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Owner Tab */}
                {activeTab === 'owner' && (
                  <div>
                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-user mr-2"></i>Current Owner
                    </h6>
                    <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                      <div className="d-flex align-items-center">
                        <img
                          src={budget.user_avatar || "../images/placeholder.png"}
                          alt={budget.user_name}
                          className="rounded-circle mr-3"
                          style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                        />
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{budget.user_name}</div>
                          <small className="text-muted">{budget.user_email}</small>
                        </div>
                      </div>
                    </div>

                    <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-user-edit mr-2"></i>Change Owner
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
                      
                      {selectedUser && selectedUser.id !== budget.user_id && (
                        <div className="d-flex align-items-center p-2 mt-2" style={{ background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
                          <i className="fas fa-exclamation-triangle text-warning mr-2"></i>
                          <small className="text-muted">Ownership will transfer to <strong>{selectedUser.user_metadata?.full_name || selectedUser.email?.split('@')[0]}</strong></small>
                        </div>
                      )}
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
                  <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '9px' }}>{budget.id?.substring(0, 12)}...</code>
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
                      <><span className="spinner-border spinner-border-sm mr-1"></span>Saving...</>
                    ) : (
                      <><i className="fas fa-save mr-1"></i>Save</>
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

export default EditBudgetModal;
