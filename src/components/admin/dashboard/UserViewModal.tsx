import { FC, useState, useEffect } from "react";
import { Badge } from "react-bootstrap";
import { supabaseAdmin } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";

interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  avatar_url?: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  is_active?: boolean;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  banned?: boolean;
}

interface UserViewModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate?: (updatedUser: User) => void;
}

const UserViewModal: FC<UserViewModalProps> = ({ user, isOpen, onClose, onUserUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { showSuccessToast, showErrorToast } = useToast();

  useEffect(() => {
    if (user && isOpen) {
      fetchUserDetails();
    }
  }, [user, isOpen]);

  const fetchUserDetails = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch user profile details
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // Check if user is admin
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id);

      if (adminError && adminError.code !== "PGRST116") {
        console.warn("Error checking admin status:", adminError);
      }

      setIsAdmin(Boolean(adminData && adminData.length > 0));
      setUserDetails({ ...user, ...profileData });
    } catch (error) {
      console.error("Error fetching user details:", error);
      showErrorToast("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async () => {
    if (!userDetails) return;
    
    setLoading(true);
    try {
      if (isAdmin) {
        // Remove admin role
        const { error } = await supabaseAdmin
          .from("admin_users")
          .delete()
          .eq("user_id", userDetails.id);

        if (error) throw error;
        
        setIsAdmin(false);
        showSuccessToast("Admin role removed successfully");
      } else {
        // Add admin role
        const { error } = await supabaseAdmin
          .from("admin_users")
          .insert({ user_id: userDetails.id });

        if (error) throw error;
        
        setIsAdmin(true);
        showSuccessToast("Admin role granted successfully");
      }

      if (onUserUpdate) {
        onUserUpdate({ ...userDetails, role: isAdmin ? "user" : "admin" });
      }
    } catch (error) {
      console.error("Error updating admin role:", error);
      showErrorToast("Failed to update admin role");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async () => {
    if (!userDetails) return;
    
    setLoading(true);
    try {
      const newStatus = !userDetails.is_active;
      
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: newStatus })
        .eq("id", userDetails.id);

      if (error) throw error;
      
      setUserDetails({ ...userDetails, is_active: newStatus });
      showSuccessToast(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
      
      if (onUserUpdate) {
        onUserUpdate({ ...userDetails, is_active: newStatus });
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      showErrorToast("Failed to update user status");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  const getStatusInfo = (isActive: boolean | undefined) => {
    if (isActive) {
      return { label: 'Active', color: '#28a745', bgColor: 'rgba(40, 167, 69, 0.1)', icon: 'fa-check-circle' };
    }
    return { label: 'Inactive', color: '#6c757d', bgColor: 'rgba(108, 117, 125, 0.1)', icon: 'fa-pause-circle' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const displayUser = userDetails || user;
  const statusInfo = getStatusInfo(displayUser?.is_active);
  const memberDays = Math.floor((Date.now() - new Date(displayUser.created_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={onClose}>
        <div 
          className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" 
          onClick={(e) => e.stopPropagation()}
          style={{ margin: '0 auto' }}
        >
          {/* Unified Modal - Mobile/Desktop Responsive */}
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
            <div 
              className="modal-header border-0 text-white py-2 md:py-3" 
              style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}
            >
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
                  <i className={`fas fa-user-circle ${window.innerWidth < 768 ? '' : 'fa-lg'}`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-sm md:text-base truncate">User Details</h6>
                  <small className="d-block truncate" style={{ opacity: 0.9, fontSize: window.innerWidth < 768 ? '0.7rem' : '0.8rem' }}>
                    {displayUser.user_metadata?.full_name || displayUser.full_name || displayUser.email}
                  </small>
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm flex-shrink-0" 
                  onClick={onClose} 
                  style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}
                >
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Quick Stats Bar - Mobile Optimized */}
            <div className="px-2 md:px-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              {/* Mobile: 2x2 Grid */}
              <div className="block md:hidden">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-2">
                    <i className={`fas ${statusInfo.icon} text-xs`} style={{ color: statusInfo.color }}></i>
                    <div>
                      <p className="text-[8px] text-gray-500 leading-none">Status</p>
                      <p className="text-[10px] font-bold" style={{ color: statusInfo.color }}>{statusInfo.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-2">
                    <i className={`fas ${isAdmin ? 'fa-shield-alt' : 'fa-user'} text-red-500 text-xs`}></i>
                    <div>
                      <p className="text-[8px] text-gray-500 leading-none">Role</p>
                      <p className="text-[10px] font-bold text-red-500">{isAdmin ? 'Admin' : 'User'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-2">
                    <i className="fas fa-calendar-alt text-red-500 text-xs"></i>
                    <div>
                      <p className="text-[8px] text-gray-500 leading-none">Member</p>
                      <p className="text-[10px] font-bold text-red-500">{memberDays}d</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-2">
                    <i className={`fas ${displayUser.email_confirmed_at ? 'fa-check-circle text-emerald-500' : 'fa-exclamation-circle text-amber-500'} text-xs`}></i>
                    <div>
                      <p className="text-[8px] text-gray-500 leading-none">Email</p>
                      <p className={`text-[10px] font-bold ${displayUser.email_confirmed_at ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {displayUser.email_confirmed_at ? 'Verified' : 'Pending'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Desktop: Row Layout */}
              <div className="hidden md:block">
                <div className="row text-center g-2">
                  <div className="col-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className={`fas ${statusInfo.icon} mr-2`} style={{ color: statusInfo.color }}></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Status</small>
                        <strong style={{ color: statusInfo.color, fontSize: '0.8rem' }}>{statusInfo.label}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className={`fas ${isAdmin ? 'fa-shield-alt' : 'fa-user'} text-danger mr-2`}></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Role</small>
                        <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{isAdmin ? 'Admin' : 'User'}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="fas fa-calendar-alt text-danger mr-2"></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Member</small>
                        <strong className="text-danger" style={{ fontSize: '0.8rem' }}>{memberDays}d</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className={`fas ${displayUser.email_confirmed_at ? 'fa-check-circle text-success' : 'fa-exclamation-circle text-warning'} mr-2`}></i>
                      <div className="text-left">
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', lineHeight: 1 }}>Email</small>
                        <strong style={{ fontSize: '0.8rem' }} className={displayUser.email_confirmed_at ? 'text-success' : 'text-warning'}>
                          {displayUser.email_confirmed_at ? 'Verified' : 'Pending'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation - Mobile Optimized */}
            <div className="px-2 md:px-3 pt-2">
              {/* Mobile: Full Width Tabs */}
              <div className="block md:hidden">
                <div className="flex gap-1">
                  {[
                    { id: 'overview', icon: 'fa-user', label: 'Overview' },
                    { id: 'account', icon: 'fa-id-card', label: 'Account' },
                    { id: 'actions', icon: 'fa-cogs', label: 'Actions' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      className={`flex-1 py-1.5 px-2 rounded-full text-[10px] font-medium transition-colors ${
                        activeTab === tab.id 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <i className={`fas ${tab.icon} mr-1`}></i>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Desktop: Normal Tabs */}
              <div className="hidden md:flex" style={{ gap: '6px' }}>
                {[
                  { id: 'overview', icon: 'fa-user', label: 'Overview' },
                  { id: 'account', icon: 'fa-id-card', label: 'Account' },
                  { id: 'actions', icon: 'fa-cogs', label: 'Actions' }
                ].map(tab => (
                  <button
                    key={tab.id}
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

            {/* Modal Body - Compact */}
            <div className="modal-body py-3" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-danger" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading user details...</p>
                </div>
              ) : (
                <>
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="row">
                      {/* Left Column - Profile */}
                      <div className="col-lg-5 text-center mb-3 mb-lg-0">
                        <div className="position-relative d-inline-block mb-3">
                          <img
                            src={displayUser.user_metadata?.avatar_url || displayUser.avatar_url || "../images/placeholder.png"}
                            alt={displayUser.user_metadata?.full_name || displayUser.full_name || "User"}
                            className="rounded-circle"
                            style={{ width: '100px', height: '100px', objectFit: 'cover', border: '3px solid #dc3545' }}
                            onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                          />
                          <div className="position-absolute" style={{ bottom: '5px', right: '5px', width: '20px', height: '20px', borderRadius: '50%', background: statusInfo.color, border: '2px solid white' }}></div>
                        </div>
                        <h6 className="font-weight-bold mb-1">{displayUser.user_metadata?.full_name || displayUser.full_name || "Unnamed User"}</h6>
                        <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>{displayUser.email}</p>
                        <div className="d-flex justify-content-center flex-wrap" style={{ gap: '6px' }}>
                          <Badge bg={displayUser.is_active ? 'success' : 'secondary'} style={{ fontSize: '0.7rem' }}>
                            <i className={`fas ${statusInfo.icon} mr-1`}></i>{statusInfo.label}
                          </Badge>
                          <Badge bg={isAdmin ? 'danger' : 'primary'} style={{ fontSize: '0.7rem' }}>
                            <i className={`fas ${isAdmin ? 'fa-shield-alt' : 'fa-user'} mr-1`}></i>
                            {isAdmin ? 'Administrator' : 'User'}
                          </Badge>
                          {displayUser.email_confirmed_at && (
                            <Badge bg="info" style={{ fontSize: '0.7rem' }}>
                              <i className="fas fa-check-circle mr-1"></i>Verified
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Right Column - Quick Info */}
                      <div className="col-lg-7">
                        <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-info-circle mr-2"></i>Quick Info</h6>
                        <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem' }}>
                          <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                            <small className="text-muted">User ID</small>
                            <code style={{ fontSize: '0.75rem' }}>{displayUser.id?.substring(0, 16)}...</code>
                          </div>
                          <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                            <small className="text-muted">Member Since</small>
                            <span style={{ fontSize: '0.8rem' }}>{new Date(displayUser.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="d-flex justify-content-between py-1" style={{ borderBottom: '1px solid #e9ecef' }}>
                            <small className="text-muted">Last Login</small>
                            <span style={{ fontSize: '0.8rem' }}>{displayUser.last_sign_in_at ? formatDate(displayUser.last_sign_in_at) : 'Never'}</span>
                          </div>
                          <div className="d-flex justify-content-between py-1">
                            <small className="text-muted">Email Verified</small>
                            <span style={{ fontSize: '0.8rem' }}>
                              {displayUser.email_confirmed_at ? (
                                <span className="text-success"><i className="fas fa-check mr-1"></i>{new Date(displayUser.email_confirmed_at).toLocaleDateString()}</span>
                              ) : (
                                <span className="text-warning"><i className="fas fa-exclamation-triangle mr-1"></i>Not verified</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Account Tab */}
                  {activeTab === 'account' && (
                    <div>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-id-card mr-2"></i>Account Details</h6>
                          <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                            <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.8rem' }}>
                              <tbody>
                                <tr><td className="text-muted py-1">Full Name</td><td className="text-right py-1"><strong>{displayUser.user_metadata?.full_name || displayUser.full_name || 'Not set'}</strong></td></tr>
                                <tr><td className="text-muted py-1">Email</td><td className="text-right py-1">{displayUser.email}</td></tr>
                                <tr><td className="text-muted py-1">Role</td><td className="text-right py-1"><Badge bg={isAdmin ? 'danger' : 'primary'} style={{ fontSize: '0.65rem' }}>{isAdmin ? 'Admin' : 'User'}</Badge></td></tr>
                                <tr><td className="text-muted py-1">Status</td><td className="text-right py-1"><Badge bg={displayUser.is_active ? 'success' : 'secondary'} style={{ fontSize: '0.65rem' }}>{displayUser.is_active ? 'Active' : 'Inactive'}</Badge></td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="col-md-6 mb-3">
                          <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-clock mr-2"></i>Activity</h6>
                          <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                            <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.8rem' }}>
                              <tbody>
                                <tr><td className="text-muted py-1">Created</td><td className="text-right py-1">{new Date(displayUser.created_at).toLocaleDateString()}</td></tr>
                                <tr><td className="text-muted py-1">Last Login</td><td className="text-right py-1">{displayUser.last_sign_in_at ? new Date(displayUser.last_sign_in_at).toLocaleDateString() : 'Never'}</td></tr>
                                <tr><td className="text-muted py-1">Days Active</td><td className="text-right py-1"><strong className="text-danger">{memberDays}</strong></td></tr>
                                <tr><td className="text-muted py-1">Verified</td><td className="text-right py-1"><Badge bg={displayUser.email_confirmed_at ? 'success' : 'warning'} style={{ fontSize: '0.65rem' }}>{displayUser.email_confirmed_at ? 'Yes' : 'No'}</Badge></td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Account Settings */}
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.9rem' }}><i className="fas fa-cogs mr-2"></i>Account Settings</h6>
                      <div className="p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.8rem' }}>
                          <tbody>
                            <tr><td className="text-muted py-1">User ID</td><td className="text-right py-1"><code style={{ fontSize: '0.7rem' }}>{displayUser.id}</code></td></tr>
                            <tr><td className="text-muted py-1">Currency</td><td className="text-right py-1">{(displayUser as any)?.currency_preference || "USD"}</td></tr>
                            <tr><td className="text-muted py-1">Timezone</td><td className="text-right py-1">{(displayUser as any)?.timezone || "UTC"}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Actions Tab */}
                  {activeTab === 'actions' && (
                    <div>
                      <h6 className="text-danger mb-3" style={{ fontSize: '0.9rem' }}><i className="fas fa-tools mr-2"></i>User Management Actions</h6>
                      <div className="row g-2">
                        <div className="col-md-6 mb-2">
                          <div 
                            className="p-3 text-center h-100" 
                            style={{ background: '#f8f9fa', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s' }}
                            onClick={toggleAdminRole}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = isAdmin ? '#6c757d' : '#17a2b8'; e.currentTarget.style.background = isAdmin ? '#f5f5f5' : '#e7f6f8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f8f9fa'; }}
                          >
                            <div className="d-flex align-items-center justify-content-center mb-2" style={{ width: '40px', height: '40px', background: isAdmin ? 'rgba(108, 117, 125, 0.1)' : 'rgba(23, 162, 184, 0.1)', borderRadius: '8px', margin: '0 auto' }}>
                              <i className={`fas ${isAdmin ? 'fa-user-minus' : 'fa-user-shield'} ${isAdmin ? 'text-secondary' : 'text-info'}`}></i>
                            </div>
                            <h6 className="mb-1" style={{ fontSize: '0.85rem' }}>{isAdmin ? 'Remove Admin' : 'Make Admin'}</h6>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>{isAdmin ? 'Remove privileges' : 'Grant admin access'}</small>
                          </div>
                        </div>
                        <div className="col-md-6 mb-2">
                          <div 
                            className="p-3 text-center h-100" 
                            style={{ background: '#f8f9fa', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s' }}
                            onClick={toggleUserStatus}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = displayUser.is_active ? '#ffc107' : '#28a745'; e.currentTarget.style.background = displayUser.is_active ? '#fff8e1' : '#e8f5e9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f8f9fa'; }}
                          >
                            <div className="d-flex align-items-center justify-content-center mb-2" style={{ width: '40px', height: '40px', background: displayUser.is_active ? 'rgba(255, 193, 7, 0.1)' : 'rgba(40, 167, 69, 0.1)', borderRadius: '8px', margin: '0 auto' }}>
                              <i className={`fas ${displayUser.is_active ? 'fa-user-slash' : 'fa-user-check'} ${displayUser.is_active ? 'text-warning' : 'text-success'}`}></i>
                            </div>
                            <h6 className="mb-1" style={{ fontSize: '0.85rem' }}>{displayUser.is_active ? 'Deactivate User' : 'Activate User'}</h6>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>{displayUser.is_active ? 'Disable account access' : 'Enable account access'}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer - Mobile Optimized */}
            <div className="modal-footer border-0 py-2 px-2 md:px-3" style={{ background: '#f8f9fa' }}>
              {/* Mobile Footer */}
              <div className="block md:hidden w-100">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-400 truncate max-w-[120px]">
                    <i className="fas fa-fingerprint mr-1"></i>
                    {displayUser.id?.substring(0, 8)}...
                  </span>
                  <button 
                    type="button" 
                    className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-medium rounded-lg transition-colors"
                    onClick={onClose}
                  >
                    <i className="fas fa-times mr-1"></i>Close
                  </button>
                </div>
              </div>
              {/* Desktop Footer */}
              <div className="hidden md:flex w-100 align-items-center">
                <small className="text-muted mr-auto" style={{ fontSize: '0.75rem' }}>
                  <i className="fas fa-fingerprint mr-1"></i>ID: <code style={{ fontSize: '0.7rem' }}>{displayUser.id?.substring(0, 12)}...</code>
                </small>
                <button type="button" className="btn btn-danger btn-sm" onClick={onClose}>
                  <i className="fas fa-times mr-1"></i>Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserViewModal;
