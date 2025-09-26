import React, { useState, FC, ChangeEvent, FormEvent, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { familyService } from "../../services/database/familyService";
import { refreshFamilyMembershipsView } from "../../utils/helpers";
import { FamilyNotificationService } from "../../services/database/familyNotificationService";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface RouteParams {
  id: string;
}

interface FamilyFormData {
  family_name: string;
  description: string;
  is_public: boolean;
  // currency_pref removed - always PHP
}

interface FamilyData {
  id: string;
  family_name: string;
  description?: string;
  currency_pref: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  is_public?: boolean;
}

const EditFamily: FC = () => {
  const { id } = useParams<keyof RouteParams>() as RouteParams;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [viewMode, setViewMode] = useState<"form" | "review">("form");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [originalFamily, setOriginalFamily] = useState<FamilyData | null>(null);

  const initialFormState: FamilyFormData = {
    family_name: "",
    description: "",
    is_public: false,
    // currency_pref removed - always PHP
  };

  const [familyData, setFamilyData] = useState<FamilyFormData>(initialFormState);

  // Fetch family data
  useEffect(() => {
    const fetchFamilyData = async () => {
      if (!user) {
        showErrorToast("You must be logged in to edit family details.");
        navigate("/login");
        return;
      }

      if (!id) {
        showErrorToast("No family ID provided.");
        navigate("/family");
        return;
      }

      setLoading(true);
      try {
        // Fetch family details using service
        const family = await familyService.getFamilyById(id);
        
        if (!family) {
          showErrorToast("Family not found.");
          navigate("/family");
          return;
        }

        // Check if user is the creator
        if (family.created_by !== user.id) {
          showErrorToast("Only the family creator can edit family details.");
          navigate("/family");
          return;
        }

        // Set original family data
        setOriginalFamily(family);
        
        // Set form data
        setFamilyData({
          family_name: family.family_name || "",
          description: family.description || "",
          is_public: family.is_public || false,
          // currency_pref removed - always PHP
        });
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching family data:", err);
        showErrorToast(`Failed to load family data: ${err instanceof Error ? err.message : "Unknown error"}`);
        navigate("/family");
      }
    };

    fetchFamilyData();
  }, [id, user, navigate, showErrorToast]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setFamilyData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReview = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!familyData.family_name) {
      setError("Please enter a family name.");
      return;
    }

    if (familyData.family_name.length < 3) {
      setError("Family name must be at least 3 characters long.");
      return;
    }

    setViewMode("review");
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!user || !originalFamily) {
      showErrorToast("You must be logged in to update family details.");
      return;
    }

    // Double-check that the user is the creator
    if (originalFamily.created_by !== user.id) {
      showErrorToast("Only the family creator can update family details.");
      return;
    }

    setIsSubmitting(true);

    try {
      await familyService.updateFamily(
        originalFamily.id,
        {
          family_name: familyData.family_name,
          description: familyData.description,
          currency_pref: 'PHP', // Always force PHP
          is_public: familyData.is_public,
        },
        user.id
      );

      // Trigger family update notifications
      try {
        await FamilyNotificationService.getInstance().handleFamilyUpdated({
          family_id: originalFamily.id,
          user_id: user.id,
          family_name: familyData.family_name,
          description: familyData.description,
          is_public: familyData.is_public,
          updated_at: new Date().toISOString()
        });
        console.log('Family update notifications processed successfully');
      } catch (notificationError) {
        // Log notification error but don't fail the family update
        console.warn('Failed to process family update notifications:', notificationError);
      }

      // Try to refresh the materialized view
      try {
        await refreshFamilyMembershipsView();
      } catch (refreshError) {
        console.warn("Failed to refresh materialized view (non-critical):", refreshError);
        // Continue anyway as this isn't critical - this is expected to fail sometimes
        // The materialized view will be refreshed by database triggers or scheduled tasks
      }

      showSuccessToast('Family updated successfully!');
      
      // Short delay to ensure the database has propagated the changes
      setTimeout(() => navigate('/family'), 500);
    } catch (err) {
      console.error('Error updating family:', err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      
      // Provide more specific error messages
      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        showErrorToast('A family with this name already exists. Please choose a different name.');
        setError('A family with this name already exists. Please choose a different name.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('not authorized')) {
        showErrorToast('You do not have permission to update this family.');
        setError('You do not have permission to update this family.');
      } else {
        showErrorToast(`Failed to update family: ${errorMessage}`);
        setError(errorMessage);
      }
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
    'family-info': {
      title: 'Family Information',
      description: 'Update details about your family group. This information will be visible to all family members.'
    },
    'currency-selection': {
      title: 'Currency Selection',
      description: 'The selected currency will be the default for all family financial calculations and displays.'
    },
    'family-settings': {
      title: 'Family Settings',
      description: 'Learn about the family settings you can manage as the creator of this family group.'
    },
    'visibility-option': {
      title: 'Family Visibility',
      description: 'Control who can discover and request to join your family. Public families can be found by other users.'
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">Loading family information...</p>
        </div>
      </div>
    );
  }

  if (viewMode === "review") {
    return (
      <div className="container-fluid animate__animated animate__fadeIn">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Review Family Updates</h1>
          <Link to="/family" className="btn btn-sm btn-secondary shadow-sm">
            <i className="fas fa-arrow-left fa-sm mr-2"></i> Cancel
          </Link>
        </div>

        <div className="row">
          <div className="col-lg-8 mx-auto">
            <div className="card shadow mb-4">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">Family Details</h6>
              </div>
              <div className="card-body">
                <div className="row mb-4">
                  <div className="col-md-6 mb-4 mb-md-0">
                    <div className="card border-left-primary shadow h-100 py-2">
                      <div className="card-body">
                        <div className="row no-gutters align-items-center">
                          <div className="col mr-2">
                            <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                              Family Name
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">{familyData.family_name}</div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-home fa-2x text-gray-300"></i>
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
                              Currency
                            </div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">PHP (₱)</div>
                          </div>
                          <div className="col-auto">
                            <i className="fas fa-dollar-sign fa-2x text-gray-300"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card bg-light mb-4">
                  <div className="card-body">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      Description
                    </div>
                    <p className="mb-0">{familyData.description || "No description provided."}</p>
                  </div>
                </div>
                
                <div className="card bg-light mb-4">
                  <div className="card-body">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      Visibility
                    </div>
                    <p className="mb-0">
                      {familyData.is_public ? (
                        <>
                          <i className="fas fa-globe text-success mr-2"></i> 
                          Public - Other users can discover and request to join your family
                        </>
                      ) : (
                        <>
                          <i className="fas fa-lock text-secondary mr-2"></i> 
                          Private - Only people you invite can join your family
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {originalFamily && (
                  <div className="alert alert-info mb-4">
                    <i className="fas fa-info-circle mr-2"></i>
                    This family was created on {new Date(originalFamily.created_at).toLocaleDateString()}.
                  </div>
                )}

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
                    <span className="text">{isSubmitting ? "Updating..." : "Update Family"}</span>
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
        <h1 className="h3 mb-0 text-gray-800">Edit Family</h1>
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
        <div className="col-lg-8">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                Family Information
                <i 
                  className="fas fa-info-circle ml-1 text-gray-400"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => toggleTip('family-info', e)}
                ></i>
              </h6>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleReview}>
                <div className="form-group">
                  <label htmlFor="family_name" className="font-weight-bold text-gray-800">
                    Family Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="family_name"
                    name="family_name"
                    value={familyData.family_name}
                    onChange={handleChange}
                    className="form-control form-control-user"
                    placeholder="Enter your family name"
                    required
                  />
                  <small className="form-text text-muted">
                    Choose a name that identifies your family group.
                  </small>
                </div>

                {/* Currency is now fixed to PHP - display only */}
                <div className="form-group">
                  <label className="font-weight-bold text-gray-800">
                    Currency
                  </label>
                  <div className="form-control-static">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-peso-sign text-success mr-2"></i>
                      <span className="font-weight-bold">PHP - Philippine Peso (₱)</span>
                      <span className="badge badge-primary ml-2">Default</span>
                    </div>
                  </div>
                  <small className="form-text text-muted">
                    <i className="fas fa-info-circle mr-1 text-gray-400"></i>
                    The application now uses Philippine Pesos for all financial calculations.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="description" className="font-weight-bold text-gray-800">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={familyData.description}
                    onChange={handleChange}
                    className="form-control"
                    rows={4}
                    placeholder="Add a description for your family group"
                  ></textarea>
                </div>

                <div className="form-group">
                  <div className="card border-left-info shadow p-3 mb-3">
                    <div className="mb-3">
                      <h5 className="font-weight-bold text-info mb-0">
                        <i className="fas fa-globe mr-2"></i>
                        Family Visibility
                      </h5>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-8">
                        <div className="d-flex align-items-center mb-3">
                          <input
                            type="checkbox"
                            className="mr-2"
                            id="is_public"
                            name="is_public"
                            checked={familyData.is_public}
                            onChange={(e) => {
                              setFamilyData(prev => ({
                                ...prev,
                                is_public: e.target.checked
                              }));
                            }}
                          />
                          <label className="font-weight-bold text-nowrap mb-0" htmlFor="is_public">
                            Make this family public
                            <i 
                              className="fas fa-info-circle ml-1 text-gray-400"
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => toggleTip('visibility-option', e)}
                            ></i>
                          </label>
                        </div>
                        <small className="form-text text-muted d-block">
                          <i className="fas fa-info-circle mr-1"></i>
                          When enabled, other users can discover and request to join your family.
                        </small>
                        <small className="form-text text-muted d-block mt-1">
                          <i className="fas fa-lock mr-1"></i>
                          If not enabled, only people you invite can join your family.
                        </small>
                        {familyData.is_public && (
                          <div className="alert alert-info mt-2 py-2 mb-0">
                            <i className="fas fa-globe mr-1"></i>
                            This family will be discoverable by other users.
                          </div>
                        )}
                      </div>
                      <div className="col-md-4">
                      </div>
                    </div>
                  </div>
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
                About Family Settings
                <i 
                  className="fas fa-info-circle ml-1 text-gray-400"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => toggleTip('family-settings', e)}
                ></i>
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(78, 115, 223, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-home text-primary"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Family Profile</p>
                </div>
                <p className="text-sm ml-5 mb-0">Update your family name and description</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(28, 200, 138, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-peso-sign text-success"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Currency (PHP Only)</p>
                </div>
                <p className="text-sm ml-5 mb-0">All family finances now use Philippine Pesos</p>
              </div>

              <div className="mb-0">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(246, 194, 62, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-shield-alt text-warning"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Privacy & Access</p>
                </div>
                <p className="text-sm ml-5 mb-0">As the family creator, you have full control over family settings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditFamily; 