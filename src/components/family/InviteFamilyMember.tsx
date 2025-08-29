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
  role: "admin" | "viewer";
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
    role: "viewer",
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
          invited_email: invite.email,
          role: invite.role,
          message: invite.message
        },
        user.id
      );

      showSuccessToast('Invitation sent successfully!');
      navigate("/family");
    } catch (err) {
      console.error('Error sending invitation:', err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      
      // Provide more specific error messages
      if (errorMessage.includes('already invited') || errorMessage.includes('duplicate')) {
        setError('This user has already been invited to your family.');
        showErrorToast('This user has already been invited to your family.');
      } else if (errorMessage.includes('not found') || errorMessage.includes('invalid email')) {
        setError('User not found. Please ensure the email address is correct and the user has an account.');
        showErrorToast('User not found. Please ensure the email address is correct and the user has an account.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('not authorized')) {
        setError('You do not have permission to invite members to this family.');
        showErrorToast('You do not have permission to invite members to this family.');
      } else {
        setError(errorMessage);
        showErrorToast(`Failed to send invitation: ${errorMessage}`);
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
        <div className="text-center my-5">
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
    );
  }

  return (
    <div className="container-fluid animate__animated animate__fadeIn">
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
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                    </select>
                    <small className="form-text text-muted">
                        Admins can manage family members and settings. Viewers can only see family data.
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
                <p className="text-sm ml-5 mb-0">Choose viewer or admin permissions for each member</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteFamilyMember; 