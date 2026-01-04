import React, { useState, FC, FormEvent } from "react";
import { useToast } from "../../../utils/ToastContext";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { formatCurrency } from "../../../utils/helpers";
import { AddGoalModalProps, GoalFormData, GoalUser, GoalCategory } from "./types";

const AddGoalModal: FC<AddGoalModalProps> = ({ 
  show, 
  onClose, 
  onGoalAdded, 
  users, 
  categories 
}) => {
  const [formData, setFormData] = useState<GoalFormData>({
    goal_name: "",
    target_amount: 0,
    current_amount: 0,
    target_date: "",
    priority: "medium",
    status: "active",
    category: "",
    notes: "",
    user_id: "",
    family_id: ""
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const { showSuccessToast, showErrorToast } = useToast();

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.goal_name.trim()) {
      newErrors.goal_name = "Goal name is required";
    } else if (formData.goal_name.trim().length < 3) {
      newErrors.goal_name = "Goal name must be at least 3 characters";
    }

    if (!formData.user_id) {
      newErrors.user_id = "Please select a user";
    }

    if (formData.target_amount <= 0) {
      newErrors.target_amount = "Target amount must be greater than 0";
    } else if (formData.target_amount > 999999999) {
      newErrors.target_amount = "Target amount is too large";
    }

    if (formData.current_amount < 0) {
      newErrors.current_amount = "Current amount cannot be negative";
    } else if (formData.current_amount > formData.target_amount) {
      newErrors.current_amount = "Current amount cannot exceed target amount";
    }

    if (!formData.target_date) {
      newErrors.target_date = "Target date is required";
    } else {
      const targetDate = new Date(formData.target_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (targetDate <= today) {
        newErrors.target_date = "Target date must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Handle user selection
  const handleUserSelect = (user: GoalUser) => {
    setFormData(prev => ({ ...prev, user_id: user.id }));
    setUserSearch("");
    setShowUserDropdown(false);
    
    // Clear user selection error
    if (errors.user_id) {
      setErrors(prev => ({ ...prev, user_id: "" }));
    }
  };

  // Handle user search input
  const handleUserSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserSearch(e.target.value);
    setShowUserDropdown(true);
    
    // Clear user selection if searching
    if (formData.user_id && e.target.value !== "") {
      setFormData(prev => ({ ...prev, user_id: "" }));
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    if (!userSearch) return true;
    const searchLower = userSearch.toLowerCase();
    const fullName = user.user_metadata?.full_name?.toLowerCase() || '';
    const email = user.email.toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  const selectedUser = users.find(u => u.id === formData.user_id);

  // Calculate progress percentage
  const progressPercentage = formData.target_amount > 0 
    ? Math.min((formData.current_amount / formData.target_amount) * 100, 100)
    : 0;

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const goalData = {
        user_id: formData.user_id,
        goal_name: formData.goal_name.trim(),
        target_amount: formData.target_amount,
        current_amount: formData.current_amount,
        target_date: formData.target_date,
        priority: formData.priority,
        status: formData.status,
        category: formData.category || undefined,
        notes: formData.notes.trim() || undefined,
        family_id: formData.family_id || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('goals')
        .insert([goalData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      showSuccessToast(`Goal "${formData.goal_name}" created successfully!`);
      
      // Reset form
      setFormData({
        goal_name: "",
        target_amount: 0,
        current_amount: 0,
        target_date: "",
        priority: "medium",
        status: "active",
        category: "",
        notes: "",
        user_id: "",
        family_id: ""
      });
      
      onGoalAdded();
      onClose();

    } catch (error: any) {
      console.error('Error creating goal:', error);
      showErrorToast(error.message || 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      setFormData({
        goal_name: "",
        target_amount: 0,
        current_amount: 0,
        target_date: "",
        priority: "medium",
        status: "active",
        category: "",
        notes: "",
        user_id: "",
        family_id: ""
      });
      setErrors({});
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div
      className="modal fade show"
      style={{
        display: "block",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 9999,
        overflowY: "auto"
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Mobile Modal */}
      <div className="block md:hidden fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="bg-white w-full rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col animate__animated animate__slideInUp animate__faster">
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-red-500 to-red-600 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <i className="fas fa-bullseye text-white text-sm"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Add New Goal</h3>
                <p className="text-[10px] text-white/80">Create a financial goal</p>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              disabled={loading}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <i className="fas fa-times text-white text-sm"></i>
            </button>
          </div>

          {/* Mobile Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <form onSubmit={handleSubmit}>
              {/* Goal Name */}
              <div className="mb-3">
                <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                  Goal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none ${errors.goal_name ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="Emergency Fund, New Car..."
                  value={formData.goal_name}
                  onChange={handleChange}
                  name="goal_name"
                  disabled={loading}
                />
                {errors.goal_name && <p className="text-[10px] text-red-500 mt-1">{errors.goal_name}</p>}
              </div>

              {/* User Selection */}
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <i className="fas fa-user text-red-500 text-[8px]"></i>
                  Assign to User <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none ${errors.user_id ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="Search users..."
                  value={selectedUser ? (selectedUser.user_metadata?.full_name || selectedUser.email) : userSearch}
                  onChange={handleUserSearchChange}
                  onFocus={() => !selectedUser && setShowUserDropdown(true)}
                  disabled={loading}
                />
                {showUserDropdown && !selectedUser && userSearch !== "" && filteredUsers.length > 0 && (
                  <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                    {filteredUsers.slice(0, 5).map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-0"
                        onClick={() => handleUserSelect(user)}
                      >
                        <img
                          src={user.user_metadata?.avatar_url || "../images/placeholder.png"}
                          alt="Avatar"
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{user.user_metadata?.full_name || user.email.split('@')[0]}</p>
                          <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="mt-2 flex items-center justify-between bg-blue-50 px-2 py-1.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <img
                        src={selectedUser.user_metadata?.avatar_url || "../images/placeholder.png"}
                        alt="Avatar"
                        className="w-5 h-5 rounded-full object-cover"
                        onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                      />
                      <span className="text-[10px] text-gray-700 font-medium">{selectedUser.user_metadata?.full_name || selectedUser.email}</span>
                    </div>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => { setFormData(prev => ({ ...prev, user_id: "" })); setUserSearch(""); }}
                    >
                      <i className="fas fa-times text-[10px]"></i>
                    </button>
                  </div>
                )}
                {errors.user_id && <p className="text-[10px] text-red-500 mt-1">{errors.user_id}</p>}
              </div>

              {/* Amount Fields */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                    Target Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                    <input
                      type="number"
                      className={`w-full pl-7 pr-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none ${errors.target_amount ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="50000"
                      value={formData.target_amount || ''}
                      onChange={handleChange}
                      name="target_amount"
                      min="1"
                      step="0.01"
                      disabled={loading}
                    />
                  </div>
                  {errors.target_amount && <p className="text-[10px] text-red-500 mt-1">{errors.target_amount}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Current Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                    <input
                      type="number"
                      className={`w-full pl-7 pr-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none ${errors.current_amount ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="0"
                      value={formData.current_amount || ''}
                      onChange={handleChange}
                      name="current_amount"
                      min="0"
                      step="0.01"
                      disabled={loading}
                    />
                  </div>
                  {errors.current_amount && <p className="text-[10px] text-red-500 mt-1">{errors.current_amount}</p>}
                </div>
              </div>

              {/* Target Date & Priority */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                    Target Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none ${errors.target_date ? 'border-red-500' : 'border-gray-200'}`}
                    value={formData.target_date}
                    onChange={handleChange}
                    name="target_date"
                    min={new Date().toISOString().split('T')[0]}
                    disabled={loading}
                  />
                  {errors.target_date && <p className="text-[10px] text-red-500 mt-1">{errors.target_date}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Priority</label>
                  <select
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                    value={formData.priority}
                    onChange={handleChange}
                    name="priority"
                    disabled={loading}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Category</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                    placeholder="Emergency, Travel..."
                    value={formData.category}
                    onChange={handleChange}
                    name="category"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Status</label>
                  <select
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                    value={formData.status}
                    onChange={handleChange}
                    name="status"
                    disabled={loading}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-3">
                <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Notes</label>
                <textarea
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none resize-none"
                  placeholder="Additional details..."
                  rows={2}
                  value={formData.notes}
                  onChange={handleChange}
                  name="notes"
                  disabled={loading}
                />
              </div>

              {/* Progress Preview */}
              {formData.target_amount > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-gray-600">Progress Preview</span>
                    <span className="text-xs font-bold text-gray-800">{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progressPercentage >= 100 ? 'bg-green-500' :
                        progressPercentage >= 75 ? 'bg-blue-500' :
                        progressPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-500">{formatCurrency(formData.current_amount)}</span>
                    <span className="text-[10px] text-gray-500">{formatCurrency(formData.target_amount)}</span>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Mobile Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-plus text-xs"></i>
                  Create Goal
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Modal */}
      <div className="hidden md:block">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '85vh' }}>
            
            {/* Header - Modern Design */}
            <div className="modal-header border-0 text-white py-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
              <div className="d-flex align-items-center w-100">
                <div className="d-flex align-items-center justify-content-center mr-2" 
                     style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                  <i className="fas fa-bullseye fa-lg"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-0 font-weight-bold">Add New Goal</h6>
                  <small style={{ opacity: 0.9 }}>Create a financial goal for a user</small>
                </div>
                <button type="button" className="btn btn-light btn-sm" onClick={handleClose} disabled={loading}
                        style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body py-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            
            {/* Info Banner */}
            <div className="p-3 mb-3" style={{ background: '#e7f3ff', borderRadius: '8px', borderLeft: '3px solid #007bff' }}>
              <div className="d-flex align-items-start">
                <i className="fas fa-info-circle text-primary mr-2 mt-1"></i>
                <div>
                  <strong className="text-primary" style={{ fontSize: '0.9rem' }}>Create New Financial Goal</strong>
                  <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                    Set up a savings target for a user. Track progress and help them achieve their financial objectives.
                  </p>
                </div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="row">
                {/* Goal Name */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="goal_name" className="form-label">
                    Goal Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.goal_name ? 'is-invalid' : ''}`}
                    id="goal_name"
                    name="goal_name"
                    value={formData.goal_name}
                    onChange={handleChange}
                    placeholder="Emergency Fund, New Car, Vacation..."
                    disabled={loading}
                  />
                  {errors.goal_name && (
                    <div className="invalid-feedback">{errors.goal_name}</div>
                  )}
                </div>

                {/* User Selection */}
                <div className="col-12 mb-3">
                  <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <h6 className="mb-3" style={{ fontSize: '0.9rem' }}>
                      <i className="fas fa-user text-danger mr-2"></i>
                      User Selection
                    </h6>
                    <div className="form-group mb-0">
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>
                        Assign to User <span className="text-danger">*</span>
                      </label>
                        <div className="position-relative">
                          <input
                            type="text"
                            className={`form-control ${errors.user_id ? 'is-invalid' : ''}`}
                            placeholder="Search users by name or email..."
                            value={selectedUser ? (selectedUser.user_metadata?.full_name || selectedUser.email) : userSearch}
                            onChange={handleUserSearchChange}
                            onFocus={() => !selectedUser && setShowUserDropdown(true)}
                            disabled={loading}
                          />
                          
                          {showUserDropdown && !selectedUser && userSearch !== "" && filteredUsers.length > 0 && (
                            <div className="dropdown-menu show w-100" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                              {filteredUsers.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  className="dropdown-item d-flex align-items-center"
                                  onClick={() => handleUserSelect(user)}
                                >
                                  <img
                                    src={user.user_metadata?.avatar_url || "../images/placeholder.png"}
                                    alt="Avatar"
                                    className="rounded-circle mr-2"
                                    style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                                    onError={(e) => {
                                      e.currentTarget.src = "../images/placeholder.png";
                                    }}
                                  />
                                  <div>
                                    <div className="font-weight-bold">
                                      {user.user_metadata?.full_name || user.email.split('@')[0]}
                                    </div>
                                    <small className="text-muted">{user.email}</small>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {selectedUser && (
                          <div className="mt-2">
                            <div className="alert alert-info py-2 d-flex align-items-center">
                              <img
                                src={selectedUser.user_metadata?.avatar_url || "../images/placeholder.png"}
                                alt="Avatar"
                                className="rounded-circle mr-2"
                                style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.currentTarget.src = "../images/placeholder.png";
                                }}
                              />
                              <div>
                                <strong>Selected:</strong> {selectedUser.user_metadata?.full_name || selectedUser.email.split('@')[0]}
                                {' '}
                                <small className="text-muted">({selectedUser.email})</small>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary ml-auto"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, user_id: "" }));
                                  setUserSearch("");
                                }}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {errors.user_id && (
                          <div className="text-danger small mt-1">{errors.user_id}</div>
                        )}
                      </div>
                    </div>
                  </div>

                {/* Target Amount */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="target_amount" className="form-label">
                    Target Amount <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text">₱</span>
                    </div>
                    <input
                      type="number"
                      className={`form-control ${errors.target_amount ? 'is-invalid' : ''}`}
                      id="target_amount"
                      name="target_amount"
                      value={formData.target_amount}
                      onChange={handleChange}
                      placeholder="50000"
                      min="1"
                      step="0.01"
                      disabled={loading}
                    />
                    {errors.target_amount && (
                      <div className="invalid-feedback">{errors.target_amount}</div>
                    )}
                  </div>
                </div>

                {/* Current Amount */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="current_amount" className="form-label">
                    Current Amount
                  </label>
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text">₱</span>
                    </div>
                    <input
                      type="number"
                      className={`form-control ${errors.current_amount ? 'is-invalid' : ''}`}
                      id="current_amount"
                      name="current_amount"
                      value={formData.current_amount}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      disabled={loading}
                    />
                    {errors.current_amount && (
                      <div className="invalid-feedback">{errors.current_amount}</div>
                    )}
                  </div>
                  {formData.target_amount > 0 && (
                    <small className="text-muted">
                      Progress: {progressPercentage.toFixed(1)}% 
                      ({formatCurrency(formData.target_amount - formData.current_amount)} remaining)
                    </small>
                  )}
                </div>

                {/* Target Date */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="target_date" className="form-label">
                    Target Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className={`form-control ${errors.target_date ? 'is-invalid' : ''}`}
                    id="target_date"
                    name="target_date"
                    value={formData.target_date}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    disabled={loading}
                  />
                  {errors.target_date && (
                    <div className="invalid-feedback">{errors.target_date}</div>
                  )}
                </div>

                {/* Priority */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="priority" className="form-label">
                    Priority
                  </label>
                  <select
                    className="form-control"
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                {/* Category */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="category" className="form-label">
                    Category (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Emergency, Travel, Education..."
                    disabled={loading}
                  />
                </div>

                {/* Status */}
                <div className="col-md-6 mb-3">
                  <label htmlFor="status" className="form-label">
                    Status
                  </label>
                  <select
                    className="form-control"
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="col-12 mb-3">
                  <label htmlFor="notes" className="form-label">
                    Notes (Optional)
                  </label>
                  <textarea
                    className="form-control"
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Add any additional details about this goal..."
                    disabled={loading}
                  />
                </div>

                {/* Progress Preview */}
                {formData.target_amount > 0 && (
                  <div className="col-12 mb-3">
                    <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                      <h6 className="mb-3" style={{ fontSize: '0.9rem' }}>
                        <i className="fas fa-chart-line text-danger mr-2"></i>
                        Goal Preview
                      </h6>
                      <div className="row align-items-center">
                        <div className="col-md-7">
                          <div className="progress mb-2" style={{ height: '12px', borderRadius: '6px' }}>
                            <div
                              className={`progress-bar ${
                                progressPercentage >= 100 ? 'bg-success' :
                                progressPercentage >= 75 ? 'bg-info' :
                                progressPercentage >= 50 ? 'bg-primary' :
                                progressPercentage >= 25 ? 'bg-warning' : 'bg-danger'
                              }`}
                              role="progressbar"
                              style={{ width: `${Math.min(progressPercentage, 100)}%`, borderRadius: '6px' }}
                            >
                            </div>
                          </div>
                          <small className="text-muted">{progressPercentage.toFixed(1)}% complete</small>
                        </div>
                        <div className="col-md-5 text-md-right mt-2 mt-md-0">
                          <div className="font-weight-bold" style={{ fontSize: '0.95rem' }}>
                            {formatCurrency(formData.current_amount)} / {formatCurrency(formData.target_amount)}
                          </div>
                          <small className="text-muted">
                            {formatCurrency(formData.target_amount - formData.current_amount)} remaining
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light border-0">
                <div className="d-flex justify-content-between align-items-center w-100">
                  <small className="text-muted d-none d-sm-block" style={{ fontSize: '11px', flex: '1 1 100%', marginBottom: '4px' }}>
                    <i className="fas fa-info-circle mr-1"></i>{formData.goal_name && formData.user_id && formData.target_amount > 0 ? 'Ready to create goal' : 'Complete all required fields'}
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
                      <i className="fas fa-times mr-1"></i>
                      Cancel
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
                        <>
                          <span className="spinner-border spinner-border-sm mr-1"></span>
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-plus mr-1"></i>
                          Create
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AddGoalModal;
