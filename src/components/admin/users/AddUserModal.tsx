import { useState, FC, useRef } from "react";
import { Badge } from "react-bootstrap";
import { useToast } from "../../../utils/ToastContext";
import { supabaseAdmin, supabase } from "../../../utils/supabaseClient";

interface AddUserModalProps {
  show: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

const AddUserModal: FC<AddUserModalProps> = ({ show, onClose, onUserAdded }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "user" as "user" | "admin"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccessToast, showErrorToast } = useToast();

  const validateForm = (): string | null => {
    if (!formData.email) return "Email is required";
    if (!/\S+@\S+\.\S+/.test(formData.email)) return "Email address is invalid";
    if (!formData.password) return "Password is required";
    if (formData.password.length < 8) return "Password must be at least 8 characters";
    if (!formData.fullName) return "Full name is required";
    if (formData.fullName.length < 2) return "Full name must be at least 2 characters";
    return null;
  };

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    password += "0123456789"[Math.floor(Math.random() * 10)];
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)];
    for (let i = password.length; i < 12; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true);
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: "", color: "secondary" };
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 15;
    if (/[!@#$%^&*]/.test(password)) strength += 10;
    if (strength >= 75) return { strength, label: "Strong", color: "success" };
    if (strength >= 50) return { strength, label: "Medium", color: "warning" };
    return { strength, label: "Weak", color: "danger" };
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showErrorToast('Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast('Image size must be less than 5MB');
      return;
    }
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `profile-${userId}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error } = await supabase.storage.from('profile-pictures').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from('profile-pictures').getPublicUrl(filePath);
      return publicUrlData.publicUrl;
    } catch (err) {
      console.warn('Storage upload failed, using base64:', err);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let avatarUrl = "";
      if (selectedImage) {
        const tempUserId = `temp-${Date.now()}`;
        const uploadedUrl = await uploadImage(selectedImage, tempUserId);
        if (uploadedUrl) avatarUrl = uploadedUrl;
      }

      if (!supabaseAdmin) throw new Error("Admin client not available");

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: { full_name: formData.fullName, avatar_url: avatarUrl }
      });

      if (authError) throw new Error(authError.message);
      if (!authData?.user) throw new Error("Failed to create user");

      const userId = authData.user.id;

      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: formData.email,
        full_name: formData.fullName,
        avatar_url: avatarUrl || null,
        role: formData.role,
        email_verified: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      // Create default account
      await supabaseAdmin.from('accounts').insert({
        user_id: userId,
        account_name: 'Primary Account',
        account_type: 'checking',
        balance: 0,
        initial_balance: 0,
        currency: 'PHP',
        status: 'active',
        is_default: true,
        color: '#4CAF50'
      });

      // Create default categories
      const expenseCategories = [
        { name: 'Food & Dining', icon: 'utensils', color: '#FF6B6B' },
        { name: 'Transportation', icon: 'car', color: '#4ECDC4' },
        { name: 'Shopping', icon: 'shopping-bag', color: '#FFE66D' },
        { name: 'Entertainment', icon: 'film', color: '#95E1D3' },
        { name: 'Bills & Utilities', icon: 'file-invoice-dollar', color: '#F38181' },
        { name: 'Healthcare', icon: 'heartbeat', color: '#AA96DA' },
        { name: 'Education', icon: 'graduation-cap', color: '#FCBAD3' },
        { name: 'Other', icon: 'ellipsis-h', color: '#A8E6CF' }
      ];

      await supabaseAdmin.from('expense_categories').insert(
        expenseCategories.map(cat => ({
          user_id: userId, category_name: cat.name, icon: cat.icon, color: cat.color, is_default: true, is_active: true
        }))
      );

      const incomeCategories = [
        { name: 'Salary', icon: 'money-bill-wave', color: '#4CAF50' },
        { name: 'Freelance', icon: 'laptop', color: '#8BC34A' },
        { name: 'Investment', icon: 'chart-line', color: '#CDDC39' },
        { name: 'Gift', icon: 'gift', color: '#FFC107' },
        { name: 'Other Income', icon: 'plus-circle', color: '#FF9800' }
      ];

      await supabaseAdmin.from('income_categories').insert(
        incomeCategories.map(cat => ({
          user_id: userId, category_name: cat.name, icon: cat.icon, color: cat.color, is_default: true, is_active: true
        }))
      );

      showSuccessToast(`User ${formData.fullName} created successfully!`);
      handleClose();
      onUserAdded();
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user');
      showErrorToast(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setFormData({ email: "", password: "", fullName: "", role: "user" });
    setError("");
    setShowPassword(false);
    setSelectedImage(null);
    setPreviewUrl("");
    onClose();
  };

  if (!show) return null;

  const passwordStrength = getPasswordStrength(formData.password);
  const isFormValid = formData.email && formData.password && formData.fullName && formData.password.length >= 8;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={handleClose}>
        <div 
          className="modal-dialog modal-md modal-dialog-centered" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: '0 auto' }}
        >
          <div 
            className="modal-content border-0 shadow-lg" 
            style={{ 
              borderRadius: window.innerWidth < 768 ? '0' : '12px', 
              overflow: 'hidden', 
              maxHeight: window.innerWidth < 768 ? '100vh' : '85vh',
              minHeight: window.innerWidth < 768 ? '100vh' : 'auto'
            }}
          >
            
            {/* Header - Mobile Optimized */}
            <div className="modal-header border-0 text-white py-2 md:py-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
              <div className="d-flex align-items-center w-100">
                <div 
                  className="d-flex align-items-center justify-content-center mr-2"
                  style={{ 
                    width: window.innerWidth < 768 ? '32px' : '40px', 
                    height: window.innerWidth < 768 ? '32px' : '40px', 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '8px' 
                  }}
                >
                  <i className={`fas fa-user-plus ${window.innerWidth < 768 ? '' : 'fa-lg'}`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-sm md:text-base">Add New User</h6>
                  <small className="d-block truncate" style={{ opacity: 0.9, fontSize: window.innerWidth < 768 ? '0.7rem' : '0.8rem' }}>
                    Create a new user account
                  </small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={handleClose} 
                  disabled={loading}
                  style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}
                >
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body py-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              
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
                    <strong className="text-primary" style={{ fontSize: '0.9rem' }}>Auto-Verified Account</strong>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                      Email will be automatically verified. User can sign in immediately with provided credentials.
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Picture Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-camera mr-2"></i>Profile Picture
                  <Badge bg="secondary" className="ml-2" style={{ fontSize: '0.6rem' }}>Optional</Badge>
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="d-flex align-items-center">
                    <div className="position-relative mr-3">
                      <img 
                        src={previewUrl || "../images/placeholder.png"} 
                        alt="Preview" 
                        className="rounded-circle"
                        style={{ width: '60px', height: '60px', objectFit: 'cover', border: '2px solid #dee2e6' }}
                        onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                      />
                      {isUploading && (
                        <div className="position-absolute d-flex align-items-center justify-content-center" 
                             style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '50%' }}>
                          <div className="spinner-border text-white spinner-border-sm"></div>
                        </div>
                      )}
                    </div>
                    <div>
                      <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="d-none" />
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm mr-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading || isUploading}
                        style={{ borderRadius: '16px', padding: '4px 12px', fontSize: '0.8rem' }}
                      >
                        <i className="fas fa-upload mr-1"></i>Choose
                      </button>
                      {selectedImage && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => { setSelectedImage(null); setPreviewUrl(""); }}
                          disabled={loading}
                          style={{ borderRadius: '16px', padding: '4px 12px', fontSize: '0.8rem' }}
                        >
                          <i className="fas fa-times mr-1"></i>Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* User Information Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-user mr-2"></i>User Information
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="row">
                    <div className="col-12 mb-2">
                      <label className="mb-1" style={{ fontSize: '0.85rem' }}>
                        Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="John Doe"
                        disabled={loading}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="col-12 mb-2">
                      <label className="mb-1" style={{ fontSize: '0.85rem' }}>
                        Email Address <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        disabled={loading}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="col-12">
                      <label className="mb-1" style={{ fontSize: '0.85rem' }}>
                        Role <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-control form-control-sm"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        disabled={loading}
                        style={{ fontSize: '0.85rem' }}
                      >
                        <option value="user">Standard User</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-key mr-2"></i>Password
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="input-group input-group-sm mb-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 8 characters"
                      disabled={loading}
                      style={{ fontSize: '0.85rem' }}
                    />
                    <div className="input-group-append">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-info"
                        onClick={generatePassword}
                        disabled={loading}
                        title="Generate password"
                      >
                        <i className="fas fa-random"></i>
                      </button>
                    </div>
                  </div>
                  
                  {formData.password && (
                    <div className="d-flex align-items-center">
                      <small className="text-muted mr-2" style={{ fontSize: '0.75rem' }}>Strength:</small>
                      <div className="progress flex-grow-1" style={{ height: '4px' }}>
                        <div className={`progress-bar bg-${passwordStrength.color}`} style={{ width: `${passwordStrength.strength}%` }}></div>
                      </div>
                      <small className={`ml-2 text-${passwordStrength.color}`} style={{ fontSize: '0.75rem' }}>{passwordStrength.label}</small>
                    </div>
                  )}
                </div>
              </div>

              {/* What Will Be Created */}
              <div className="mb-0">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-list mr-2"></i>What will be created:
                </h6>
                <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
                  {[
                    { icon: 'fa-user', label: 'Account' },
                    { icon: 'fa-id-card', label: 'Profile' },
                    { icon: 'fa-wallet', label: 'Default Account' },
                    { icon: 'fa-tags', label: 'Categories' },
                    { icon: 'fa-check-circle', label: 'Verified Email' }
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
                <i className="fas fa-info-circle mr-1"></i>{isFormValid ? 'Ready to create user' : 'Complete all required fields'}
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
                  disabled={loading || isUploading || !isFormValid}
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
                    <><i className="fas fa-user-plus mr-1"></i>Create</>
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

export default AddUserModal;
