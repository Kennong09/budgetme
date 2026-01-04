import React, { useState, FC, ChangeEvent, FormEvent, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { invitationService } from "../../services/database/invitationService";
import { familyService } from "../../services/database/familyService";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface InviteFormData {
  email: string;
  role: "admin" | "member" | "viewer";
  message: string;
}

interface RouteParams {
  id: string;
}

const InviteFamilyMember: FC = () => {
  const { id: familyId } = useParams<keyof RouteParams>() as RouteParams;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [viewMode, setViewMode] = useState<"form" | "review">("form");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userFamily, setUserFamily] = useState<any>(null);

  const initialFormState: InviteFormData = {
    email: "",
    role: "member",
    message: "You're invited to join our family on BudgetMe!",
  };

  const [invite, setInvite] = useState<InviteFormData>(initialFormState);

  // Check user's family membership and permissions
  useEffect(() => {
    const checkUserFamily = async () => {
      if (!user) {
        showErrorToast("You must be logged in to invite family members.");
        navigate("/login");
        return;
      }

      if (!familyId) {
        showErrorToast("No family ID provided.");
        navigate("/family");
        return;
      }

      setLoading(true);
      try {
        // Get the specific family by ID
        const family = await familyService.getFamilyById(familyId);
        if (!family) {
          showErrorToast("Family not found.");
          navigate("/family");
          return;
        }

        // Check if user is a member of this family
        const membership = await familyService.checkSpecificFamilyMembership(user.id, familyId);
        if (!membership.is_member) {
          showErrorToast("You are not a member of this family.");
          navigate("/family");
          return;
        }

        // Check if user has admin permissions
        if (membership.role !== 'admin') {
          showErrorToast("Only family admins can invite new members.");
          navigate("/family");
          return;
        }

        setUserFamily(family);
      } catch (err) {
        console.error("Error checking family membership:", err);
        showErrorToast("Failed to verify family membership.");
        navigate("/family");
      } finally {
        setLoading(false);
      }
    };

    checkUserFamily();
  }, [user, familyId, navigate, showErrorToast]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setInvite((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReview = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!invite.email) {
      setError("Please enter an email address.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(invite.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Check if trying to invite themselves
    if (user && invite.email === user.email) {
      setError("You cannot invite yourself.");
      return;
    }

    // Additional validation could be added here to check if the email
    // already belongs to a family member, but this will be handled by the backend

    setViewMode("review");
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!user || !userFamily) {
      showErrorToast("You must be logged in and part of a family to send invitations.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await invitationService.sendInvitation(
        {
          family_id: userFamily.id,
          email: invite.email,
          role: invite.role,
          message: invite.message
        },
        user.id
      );

      showSuccessToast('Invitation sent successfully!');
      navigate("/family");
    } catch (err) {
      console.error('Error sending invitation:', err);
      
      // Enhanced error handling with classification
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      const classification = (err as any)?.classification;
      
      if (classification) {
        console.log('Error classification:', classification);
        
        // Use classified error messages
        setError(classification.userMessage);
        
        // Show appropriate toast based on error type
        if (classification.canRetry) {
          showErrorToast(`${classification.userMessage} ${classification.suggestedAction || ''}`);
        } else {
          showErrorToast(classification.userMessage);
        }
        
        // Provide specific guidance based on error type
        if (classification.type === 'USER_NOT_REGISTERED') {
          setError('This email address is not registered with BudgetMe. Please ask them to create an account first, then you can send them an invitation.');
        } else if (classification.type === 'USER_ALREADY_INVITED') {
          setError('This user has already been invited to your family. Check your sent invitations or wait for them to respond.');
        } else if (classification.type === 'USER_ALREADY_MEMBER') {
          setError('This user is already a member of another family. Users can only belong to one family at a time.');
        } else if (classification.type === 'PERMISSION_DENIED') {
          setError('You do not have permission to invite members to this family. Contact a family admin.');
        } else if (classification.type === 'VERIFICATION_FAILED') {
          setError('There was an issue verifying the user. Please double-check the email address and try again.');
        }
      } else {
        // Fallback to legacy error handling for backwards compatibility
        if (errorMessage.includes('not registered') || errorMessage.includes('create an account')) {
          setError('This email address is not registered with BudgetMe. Please ask them to create an account first, then you can send them an invitation.');
          showErrorToast('User not registered. Please ask them to create an account first.');
        } else if (errorMessage.includes('already invited') || errorMessage.includes('already been sent')) {
          setError('This user has already been invited to your family.');
          showErrorToast('This user has already been invited to your family.');
        } else if (errorMessage.includes('already part of a family') || errorMessage.includes('already a member')) {
          setError('This user is already a member of another family. Users can only belong to one family at a time.');
          showErrorToast('This user is already a member of another family.');
        } else if (errorMessage.includes('not found') || errorMessage.includes('invalid email')) {
          setError('User not found. Please ensure the email address is correct and the user has an account.');
          showErrorToast('User not found. Please ensure the email address is correct and the user has an account.');
        } else if (errorMessage.includes('permission') || errorMessage.includes('not authorized') || errorMessage.includes('admin')) {
          setError('You do not have permission to invite members to this family.');
          showErrorToast('You do not have permission to invite members to this family.');
        } else if (errorMessage.includes('Unable to verify user registration status') || errorMessage.includes('try again in a moment')) {
          setError('There was a temporary issue verifying the user. Please check the email address and try again in a moment.');
          showErrorToast('Temporary verification issue. Please try again in a moment.');
        } else if (errorMessage.includes('Internal Server Error') || errorMessage.includes('500')) {
          setError('There was a server error. Please try again in a moment. If the issue persists, please contact support.');
          showErrorToast('Server error. Please try again in a moment.');
        } else {
          setError(errorMessage);
          showErrorToast(`Failed to send invitation: ${errorMessage}`);
        }
      }
      
      setViewMode("form");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleTip = (tipId: string, event?: React.MouseEvent) => {
    if (activeTip === tipId) {
      setActiveTip(null);
      setTooltipPosition(null);
    } else {
      setActiveTip(tipId);
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({ top: rect.bottom + window.scrollY, left: rect.left + (rect.width / 2) + window.scrollX });
      }
    }
  };
  
  // Tooltip contents
  const tooltipContent = {
    'invitation-info': {
      title: 'Invitation Information',
      description: 'Enter the information needed to send an invitation to a family member. The user must have an existing BudgetMe account, and the invitation will be sent to their dashboard.'
    },
    'invitations-work': {
      title: 'Invitation Tips',
      description: 'Learn best practices for inviting family members, assigning roles, and managing your family group in BudgetMe.'
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        {/* Mobile Loading State */}
        <div className="block md:hidden py-12 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Checking permissions...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="text-center my-5 hidden md:block">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (viewMode === "review") {
    return (
      <div className="container-fluid animate__animated animate__fadeIn">
        {/* Mobile Review View */}
        <div className="block md:hidden">
          {/* Mobile Page Heading */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-bold text-gray-800">Review Invitation</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("form")}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
                  aria-label="Back to edit"
                >
                  <i className="fas fa-arrow-left text-xs"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Summary Card */}
          <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-4 mb-3 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-xs font-medium">Invitation</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <i className="fas fa-paper-plane text-white text-sm"></i>
              </div>
            </div>
            <div className="text-white text-lg font-bold mb-1 truncate">{invite.email}</div>
            <div className="text-white/70 text-xs">To: {userFamily?.family_name || "Your Family"}</div>
          </div>

          {/* Mobile Details Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                <i className="fas fa-user-shield text-blue-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Role</p>
              <p className="text-xs font-bold text-gray-800 capitalize">{invite.role}</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
                <i className="fas fa-home text-emerald-500 text-xs"></i>
              </div>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide">Family</p>
              <p className="text-xs font-bold text-gray-800 truncate">{userFamily?.family_name || "Your Family"}</p>
            </div>
          </div>

          {/* Mobile Message Card */}
          {invite.message && (
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mb-3">
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wide mb-1">Message</p>
              <p className="text-xs text-gray-700">{invite.message}</p>
            </div>
          )}

          {/* Mobile Action Buttons */}
          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => setViewMode("form")} 
              className="flex-1 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              <i className="fas fa-arrow-left mr-2 text-xs"></i>
              Edit
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2 text-xs"></i>
                  Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2 text-xs"></i>
                  Send
                </>
              )}
            </button>
          </div>
        </div>

        {/* Desktop Review View */}
        <div className="hidden md:block">
          <div className="d-sm-flex align-items-center justify-content-between mb-4">
            <h1 className="h3 mb-0 text-gray-800">Review Invitation</h1>
            <Link to="/family" className="btn btn-sm btn-secondary shadow-sm">
              <i className="fas fa-arrow-left fa-sm mr-2"></i> Cancel
            </Link>
          </div>

          <div className="row">
            <div className="col-lg-8 mx-auto">
              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">Invitation Details</h6>
                </div>
                <div className="card-body">
                  <div className="row mb-4">
                    <div className="col-md-6 mb-4 mb-md-0">
                      <div className="card border-left-primary shadow h-100 py-2">
                        <div className="card-body">
                          <div className="row no-gutters align-items-center">
                            <div className="col mr-2">
                              <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                Email
                              </div>
                              <div className="h5 mb-0 font-weight-bold text-gray-800">{invite.email}</div>
                            </div>
                            <div className="col-auto">
                              <i className="fas fa-envelope fa-2x text-gray-300"></i>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-left-info shadow h-100 py-2">
                        <div className="card-body">
                          <div className="row no-gutters align-items-center">
                            <div className="col mr-2">
                              <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                                Role
                              </div>
                              <div className="h5 mb-0 font-weight-bold text-gray-800 text-capitalize">{invite.role}</div>
                            </div>
                            <div className="col-auto">
                              <i className="fas fa-user-shield fa-2x text-gray-300"></i>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card bg-light mb-4">
                      <div className="card-body">
                        <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                          Family
                        </div>
                        <p className="mb-0">{userFamily?.family_name || "Your Family"}</p>
                      </div>
                  </div>

                  <div className="card bg-light mb-4">
                      <div className="card-body">
                        <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                          Message
                        </div>
                        <p className="mb-0">{invite.message}</p>
                      </div>
                  </div>

                  <div className="text-center mt-4">
                    <button onClick={() => setViewMode("form")} className="btn btn-light btn-icon-split mr-2">
                      <span className="icon text-gray-600">
                        <i className="fas fa-arrow-left"></i>
                      </span>
                      <span className="text">Back to Edit</span>
                    </button>
                    <button 
                      onClick={handleSubmit} 
                      disabled={isSubmitting}
                      className="btn btn-success btn-icon-split"
                    >
                      <span className="icon text-white-50">
                        <i className={isSubmitting ? "fas fa-spinner fa-spin" : "fas fa-check"}></i>
                      </span>
                      <span className="text">{isSubmitting ? "Sending..." : "Send Invitation"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid animate__animated animate__fadeIn">
      {/* Mobile Form View */}
      <div className="block md:hidden">
        {/* Mobile Page Heading */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-800">Invite Member</h1>
            <Link
              to="/family"
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shadow-sm transition-all active:scale-95"
              aria-label="Back"
            >
              <i className="fas fa-arrow-left text-xs"></i>
            </Link>
          </div>
        </div>

        {/* Mobile Info Card */}
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-4 mb-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <i className="fas fa-user-plus text-white text-lg"></i>
            </div>
            <div>
              <h3 className="text-white text-sm font-bold">Invite to Family</h3>
              <p className="text-white/70 text-xs">{userFamily?.family_name || "Your Family"}</p>
            </div>
          </div>
        </div>

        {/* Mobile Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h6 className="text-xs font-bold text-gray-800 flex items-center gap-2">
              <i className="fas fa-envelope text-emerald-500 text-[10px]"></i>
              Invitation Details
            </h6>
          </div>
          <div className="p-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-rose-600 flex items-start gap-2">
                  <i className="fas fa-exclamation-circle mt-0.5"></i>
                  <span>{error}</span>
                </p>
              </div>
            )}
            <form onSubmit={handleReview}>
              <div className="mb-4">
                <label htmlFor="email_mobile" className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                  User's Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  id="email_mobile"
                  name="email"
                  value={invite.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                  placeholder="Enter email address"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">User must have a BudgetMe account.</p>
              </div>

              <div className="mb-4">
                <label htmlFor="role_mobile" className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                  Assign Role <span className="text-rose-500">*</span>
                </label>
                <select
                  id="role_mobile"
                  name="role"
                  value={invite.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                  required
                >
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Mobile Role Info */}
              <div className="bg-blue-50 rounded-xl p-3 mb-4">
                <p className="text-[10px] font-bold text-blue-700 mb-2">Role Permissions:</p>
                <div className="space-y-1">
                  <p className="text-[10px] text-blue-600"><span className="font-semibold">Member:</span> Standard access, contribute to goals</p>
                  <p className="text-[10px] text-blue-600"><span className="font-semibold">Viewer:</span> Read-only access</p>
                  <p className="text-[10px] text-blue-600"><span className="font-semibold">Admin:</span> Full management privileges</p>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="message_mobile" className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                  Message (Optional)
                </label>
                <textarea
                  id="message_mobile"
                  name="message"
                  value={invite.message}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all resize-none"
                  rows={3}
                  placeholder="Add a personal message"
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                Continue to Review
                <i className="fas fa-arrow-right text-xs"></i>
              </button>
            </form>
          </div>
        </div>

        {/* Mobile Tips Cards */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center mx-auto mb-2">
              <i className="fas fa-user-check text-rose-500 text-xs"></i>
            </div>
            <p className="text-[9px] font-semibold text-gray-700">Account</p>
            <p className="text-[8px] text-gray-400">Required</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mx-auto mb-2">
              <i className="fas fa-user-shield text-amber-500 text-xs"></i>
            </div>
            <p className="text-[9px] font-semibold text-gray-700">Assign</p>
            <p className="text-[8px] text-gray-400">Roles</p>
          </div>
        </div>
      </div>

      {/* Desktop Form View */}
      <div className="hidden md:block">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Invite Family Member</h1>
          <Link to="/family" className="btn btn-sm btn-secondary shadow-sm">
            <i className="fas fa-arrow-left fa-sm mr-2"></i> Back to Family
          </Link>
        </div>

        {/* Tooltip */}
        {activeTip && tooltipPosition && (
          <div 
            className="tip-box light" 
            style={{ 
              position: "absolute",
              top: `${tooltipPosition.top}px`, 
              left: `${tooltipPosition.left}px`,
              transform: "translateX(-50%)",
              zIndex: 1000,
              background: "white",
              padding: "12px 15px",
              borderRadius: "8px",
              boxShadow: "0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)",
              maxWidth: "300px",
              border: "1px solid rgba(0, 0, 0, 0.05)"
            }}
          >
            {activeTip && (
              <>
                <div className="font-weight-bold mb-2">{tooltipContent[activeTip as keyof typeof tooltipContent].title}</div>
                <p className="mb-0">{tooltipContent[activeTip as keyof typeof tooltipContent].description}</p>
              </>
            )}
          </div>
        )}

        <div className="row">
          <div className="col-lg-8 mx-auto">
            <div className="card shadow mb-4">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">
                  Invitation Information
                  <i 
                    className="fas fa-info-circle ml-1 text-gray-400"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => toggleTip('invitation-info', e)}
                  ></i>
                </h6>
              </div>
              <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleReview}>
                <div className="form-group">
                  <label htmlFor="email" className="font-weight-bold text-gray-800">
                    User's Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={invite.email}
                    onChange={handleChange}
                    className="form-control form-control-user"
                    placeholder="Enter email of the user to invite"
                    required
                  />
                  <small className="form-text text-muted">
                    Enter the email address of the person you want to invite to your family.
                    <br/>
                    <strong>Note:</strong> The person must already have a BudgetMe account to receive invitations.
                  </small>
                </div>

                <div className="form-group">
                    <label htmlFor="role" className="font-weight-bold text-gray-800">
                        Assign Role <span className="text-danger">*</span>
                    </label>
                    <select
                        id="role"
                        name="role"
                        value={invite.role}
                        onChange={handleChange}
                        className="form-control"
                        required
                    >
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                    </select>
                    <small className="form-text text-muted">
                        <strong>Member:</strong> Standard privileges, can contribute to goals and view most data.<br/>
                        <strong>Viewer:</strong> Limited read-only access to family data.<br/>
                        <strong>Admin:</strong> Full management privileges including member and settings management.
                    </small>
                </div>

                <div className="form-group">
                  <label htmlFor="message" className="font-weight-bold text-gray-800">
                    Invitation Message (Optional)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={invite.message}
                    onChange={handleChange}
                    className="form-control"
                    rows={4}
                    placeholder="Add a personal message to your invitation"
                  ></textarea>
                </div>

                <hr className="my-4" />

                <div className="text-center">
                  <button type="submit" className="btn btn-primary btn-icon-split">
                    <span className="icon text-white-50">
                      <i className="fas fa-arrow-right"></i>
                    </span>
                    <span className="text">Continue to Review</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-4 d-none d-lg-block">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                Invitation Tips
                <i 
                  className="fas fa-info-circle ml-1 text-gray-400"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => toggleTip('invitations-work', e)}
                ></i>
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(220, 53, 69, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-user-check text-danger"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Account Required</p>
                </div>
                <p className="text-sm ml-5 mb-0">The person must have a BudgetMe account before you can invite them</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(78, 115, 223, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-paper-plane text-primary"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Send Invitations</p>
                </div>
                <p className="text-sm ml-5 mb-0">Invitations are sent via email and tracked in the system</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(28, 200, 138, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-check-circle text-success"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Simple Acceptance</p>
                </div>
                <p className="text-sm ml-5 mb-0">Users can accept or decline invitations from their dashboard</p>
              </div>

              <div className="mb-0">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(246, 194, 62, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-user-shield text-warning"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Assign Roles</p>
                </div>
                <p className="text-sm ml-5 mb-0">Choose member, viewer, or admin permissions for each member</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default InviteFamilyMember; 