import { FC, useState, useEffect, useRef } from "react";
import { Badge } from "react-bootstrap";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import { User } from "./types";

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (updatedUser: User) => void;
}

const EditUserModal: FC<EditUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserUpdated
}) => {
  const [fullName, setFullName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccessToast, showErrorToast } = useToast();

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || "");
      setPreviewUrl(user.user_metadata?.avatar_url || "");
      setSelectedImage(null);
      setNewPassword("");
      setShowPassword(false);
      setError("");
    }
  }, [user]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showErrorToast("Image size should be less than 5MB");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileName = `avatar-${user?.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabaseAdmin!.storage.from('avatars').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabaseAdmin!.storage.from('avatars').getPublicUrl(fileName);
      return publicUrl;
    } catch (err) {
      console.error("Image upload error:", err);
      showErrorToast("Failed to upload image");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setNewPassword(password);
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

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      let avatarUrl: string | null | undefined = user.user_metadata?.avatar_url;
      if (selectedImage) {
        avatarUrl = await uploadImage(selectedImage);
        if (!avatarUrl) {
          setLoading(false);
          return;
        }
      }

      const updateData: any = {
        user_metadata: {
          ...user.user_metadata,
          full_name: fullName.trim(),
          avatar_url: avatarUrl
        }
      };

      if (newPassword) {
        updateData.password = newPassword;
      }

      const { error: authError } = await supabaseAdmin!.auth.admin.updateUserById(user.id, updateData);
      if (authError) throw authError;

      await supabaseAdmin!.from("profiles").update({
        full_name: fullName.trim(),
        avatar_url: avatarUrl
      }).eq("id", user.id);

      showSuccessToast("User updated successfully");
      
      const updatedUser = {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          full_name: fullName.trim(),
          avatar_url: avatarUrl || ""
        }
      };

      onUserUpdated(updatedUser);
      handleClose();
    } catch (err: any) {
      console.error("Error updating user:", err);
      setError(err.message || "Failed to update user");
      showErrorToast("Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFullName("");
    setSelectedImage(null);
    setPreviewUrl("");
    setNewPassword("");
    setShowPassword(false);
    setError("");
    onClose();
  };

  if (!isOpen || !user) return null;

  const hasChanges = fullName !== (user.user_metadata?.full_name || "") || selectedImage !== null || newPassword !== "";
  const passwordStrength = getPasswordStrength(newPassword);

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
                  <i className={`fas fa-user-edit ${window.innerWidth < 768 ? '' : 'fa-lg'}`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-sm md:text-base">Edit User</h6>
                  <small className="d-block truncate" style={{ opacity: 0.9, fontSize: window.innerWidth < 768 ? '0.7rem' : '0.8rem' }}>
                    Modify user details and settings
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

              {/* User Summary Card */}
              <div className="p-3 mb-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                <div className="d-flex align-items-center">
                  <div className="position-relative mr-3">
                    <img 
                      src={previewUrl || "../images/placeholder.png"} 
                      alt={fullName || "User"} 
                      className="rounded-circle"
                      style={{ width: '70px', height: '70px', objectFit: 'cover', border: '3px solid #dc3545' }}
                      onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                    />
                    {isUploading && (
                      <div className="position-absolute d-flex align-items-center justify-content-center" 
                           style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '50%' }}>
                        <div className="spinner-border text-white spinner-border-sm"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <strong style={{ fontSize: '0.95rem' }}>{user.user_metadata?.full_name || 'Unknown User'}</strong>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{user.email}</div>
                    <div className="mt-1">
                      <Badge bg={user.status === 'active' ? 'success' : 'secondary'} style={{ fontSize: '0.65rem' }} className="mr-1">
                        {user.status || 'Inactive'}
                      </Badge>
                      {hasChanges && (
                        <Badge bg="warning" style={{ fontSize: '0.65rem' }}>
                          <i className="fas fa-exclamation-circle mr-1"></i>Unsaved
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Picture Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-camera mr-2"></i>Profile Picture
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                    <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="d-none" />
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || loading}
                      style={{ borderRadius: '16px', padding: '4px 12px', fontSize: '0.8rem' }}
                    >
                      <i className="fas fa-upload mr-1"></i>Change
                    </button>
                    {(previewUrl || selectedImage) && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => {
                          setPreviewUrl("");
                          setSelectedImage(null);
                        }}
                        disabled={isUploading || loading}
                        style={{ borderRadius: '16px', padding: '4px 12px', fontSize: '0.8rem' }}
                      >
                        <i className="fas fa-times mr-1"></i>Remove
                      </button>
                    )}
                  </div>
                  <small className="text-muted d-block mt-2" style={{ fontSize: '0.75rem' }}>
                    <i className="fas fa-info-circle mr-1"></i>Max 5MB. Formats: JPG, PNG, GIF
                  </small>
                </div>
              </div>

              {/* User Information Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-user mr-2"></i>User Information
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="form-group mb-3">
                    <label className="mb-1" style={{ fontSize: '0.85rem' }}>
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full name"
                      disabled={loading}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="mb-1" style={{ fontSize: '0.85rem' }}>
                      Email Address
                      <Badge bg="secondary" className="ml-2" style={{ fontSize: '0.6rem' }}>Read-only</Badge>
                    </label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      value={user.email}
                      disabled
                      readOnly
                      style={{ fontSize: '0.85rem', background: '#e9ecef' }}
                    />
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-key mr-2"></i>Password
                  <Badge bg="info" className="ml-2" style={{ fontSize: '0.6rem' }}>Optional</Badge>
                </h6>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="input-group input-group-sm mb-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave empty to keep current"
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
                  
                  {newPassword && (
                    <div className="mb-2">
                      <div className="d-flex align-items-center">
                        <small className="text-muted mr-2" style={{ fontSize: '0.75rem' }}>Strength:</small>
                        <div className="progress flex-grow-1" style={{ height: '4px' }}>
                          <div className={`progress-bar bg-${passwordStrength.color}`} style={{ width: `${passwordStrength.strength}%` }}></div>
                        </div>
                        <small className={`ml-2 text-${passwordStrength.color}`} style={{ fontSize: '0.75rem' }}>{passwordStrength.label}</small>
                      </div>
                    </div>
                  )}
                  
                  {newPassword && (
                    <div className="p-2" style={{ background: '#fff5f5', borderRadius: '6px', borderLeft: '3px solid #dc3545' }}>
                      <small className="text-danger" style={{ fontSize: '0.75rem' }}>
                        <i className="fas fa-exclamation-triangle mr-1"></i>
                        Password will be changed on save
                      </small>
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
              <small className="text-muted d-none d-sm-block" style={{ fontSize: '10px', flex: '1 1 100%', marginBottom: '4px' }}>
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
                  onClick={handleSave} 
                  disabled={loading || isUploading || !hasChanges}
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

export default EditUserModal;
