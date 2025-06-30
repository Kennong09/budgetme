import React, { useState, FC, ChangeEvent, FormEvent, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { refreshFamilyMembershipsView } from "../../utils/helpers";

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface FamilyFormData {
  family_name: string;
  description: string;
  currency_pref: "USD" | "EUR" | "GBP" | "JPY" | "PHP";
  is_public: boolean;
}

interface FamilyData {
  id: string;
  family_name: string;
  description: string;
  currency_pref: string;
  created_by: string;
  created_at: string;
  is_public?: boolean;
}

const CreateFamily: FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [viewMode, setViewMode] = useState<"form" | "review">("form");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [existingFamily, setExistingFamily] = useState<boolean>(false);
  const [existingFamilyData, setExistingFamilyData] = useState<FamilyData | null>(null);

  const initialFormState: FamilyFormData = {
    family_name: "",
    description: "Our shared family finances",
    currency_pref: "USD",
    is_public: false,
  };

  const [familyData, setFamilyData] = useState<FamilyFormData>(initialFormState);

  // Check if user already has a family
  useEffect(() => {
    const checkExistingFamily = async () => {
      if (!user) {
        showErrorToast("You must be logged in to create a family.");
        navigate("/login");
        return;
      }

      setLoading(true);
      try {
        // Multiple checks to ensure we correctly identify if user already has a family
        let isMember = false;
        let familyData = null;
        
        // Method 1: Try the check_user_family RPC function
        const { data: checkResult, error: checkError } = await supabase.rpc(
          'check_user_family',
          { p_user_id: user.id }
        );

        if (!checkError && checkResult) {
          // Handle different possible response formats
          if (Array.isArray(checkResult) && checkResult.length > 0) {
            isMember = checkResult[0].is_member === true;
            if (isMember && checkResult[0].family_id) {
              familyData = {
                id: checkResult[0].family_id,
                family_name: checkResult[0].family_name || "Family",
                description: checkResult[0].description || "",
                currency_pref: checkResult[0].currency_pref || "USD",
                created_by: checkResult[0].created_by || "",
                created_at: checkResult[0].created_at || "",
                is_public: checkResult[0].is_public || false
              };
            }
          } else if (typeof checkResult === 'object' && checkResult.is_member === true) {
            isMember = true;
            if (checkResult.family_id) {
              familyData = {
                id: checkResult.family_id,
                family_name: checkResult.family_name || "Family",
                description: checkResult.description || "",
                currency_pref: checkResult.currency_pref || "USD",
                created_by: checkResult.created_by || "",
                created_at: checkResult.created_at || "",
                is_public: checkResult.is_public || false
              };
            }
          }
        }
        
        // Method 2: If first check failed or didn't confirm membership, try direct function
        if (!isMember || checkError) {
          const { data: directResult, error: directError } = await supabase.rpc(
            'get_family_membership',
            { p_user_id: user.id }
          );
          
          if (!directError && directResult) {
            if (typeof directResult === 'object' && directResult.is_member === true) {
              isMember = true;
              familyData = {
                id: directResult.family_id,
                family_name: directResult.family_name || "Family",
                description: directResult.description || "",
                currency_pref: directResult.currency_pref || "USD",
                created_by: directResult.created_by || "",
                created_at: directResult.created_at || "",
                is_public: directResult.is_public || false
              };
            }
          }
        }
        
        // Method 3: Final fallback - direct query to family_members table
        if (!isMember) {
          const { data: memberCheck, error: memberError } = await supabase
            .from('family_members')
            .select('family_id, status, role')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1);
            
          if (!memberError && memberCheck && memberCheck.length > 0) {
            isMember = true;
            
            // Get family details
            const { data: familyDetails, error: familyError } = await supabase
              .from('families')
              .select('*')
              .eq('id', memberCheck[0].family_id)
              .single();
              
            if (!familyError && familyDetails) {
              familyData = familyDetails;
            }
          }
        }
        
        // If any check found membership, set existing family
        if (isMember) {
          setExistingFamily(true);
          if (familyData) {
            setExistingFamilyData(familyData);
          }
          
          showErrorToast("You are already part of a family. You can only belong to one family at a time.");
          setTimeout(() => navigate("/family"), 1000);
          return;
        }

      } catch (err) {
        console.error("Error checking existing family:", err);
        showErrorToast(`Failed to check family status: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    };

    checkExistingFamily();
  }, [user, navigate, showErrorToast]);

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
    if (!user) {
      showErrorToast("You must be logged in to create a family.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Double-check that the user doesn't already have a family using multiple methods
      let isAlreadyMember = false;
      
      // Method 1: Check using RPC function
      const { data: checkResult, error: checkError } = await supabase.rpc(
        'check_user_family',
        { p_user_id: user.id }
      );

      if (!checkError && checkResult) {
        // Handle different response formats
        if (Array.isArray(checkResult) && checkResult.length > 0 && checkResult[0].is_member === true) {
          isAlreadyMember = true;
        } else if (typeof checkResult === 'object' && checkResult.is_member === true) {
          isAlreadyMember = true;
        }
      }
      
      // Method 2: If first check failed or ambiguous, try direct function
      if (!isAlreadyMember && (checkError || !checkResult)) {
        const { data: directResult, error: directError } = await supabase.rpc(
          'get_family_membership',
          { p_user_id: user.id }
        );
        
        if (!directError && directResult && 
            typeof directResult === 'object' && 
            directResult.is_member === true) {
          isAlreadyMember = true;
        }
      }
      
      // Method 3: Final fallback - direct query to family_members table
      if (!isAlreadyMember) {
        const { data: memberData, error: memberError } = await supabase
          .from('family_members')
          .select('id, family_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);
          
        if (!memberError && memberData && memberData.length > 0) {
          isAlreadyMember = true;
        }
      }
      
      // If any check confirmed membership, prevent creation
      if (isAlreadyMember) {
        setExistingFamily(true);
        throw new Error("You are already part of a family. You can only belong to one family at a time.");
      }

      // Get form data for clarity
      const formValues = {
        family_name: familyData.family_name,
        description: familyData.description,
        currency_pref: familyData.currency_pref,
        is_public: familyData.is_public,
      };

      console.log("Creating family with data:", { ...formValues, created_by: user.id });

      // Use our new transaction-safe function
      try {
        const { data: result, error: createError } = await supabase.rpc(
          'create_family_with_member',
          {
            p_family_name: formValues.family_name,
            p_description: formValues.description,
            p_currency_pref: formValues.currency_pref,
            p_is_public: formValues.is_public,
            p_user_id: user.id
          }
        );
        
        if (createError) {
          console.error("Error creating family with RPC function:", createError);
          throw new Error(`Error creating family: ${createError.message}`);
        }
        
        console.log("Successfully created family with ID:", result);
        
        showSuccessToast('Family created successfully!');
        setTimeout(() => navigate('/family?created=true'), 800);
        return;
      } catch (rpcError) {
        console.error("RPC function failed:", rpcError);
        // Continue to legacy approach if RPC fails (for backwards compatibility)
      }
      
      // Legacy approach as fallback
      let familyId: string | null = null;
      
      // Insert family record
      const { data: newFamily, error: familyError } = await supabase
        .from('families')
        .insert({
          family_name: formValues.family_name,
          description: formValues.description,
          currency_pref: formValues.currency_pref,
          is_public: formValues.is_public,
          created_by: user.id
        })
        .select()
        .single();
      
      if (familyError) {
        console.error("Error creating family record:", familyError);
        throw new Error(`Error creating family: ${familyError.message}`);
      }
      
      if (!newFamily) {
        throw new Error('Failed to create family. No data returned from server.');
      }
      
      familyId = newFamily.id;
      console.log("Successfully created family record:", newFamily);
      
      // Insert family member record for the creator (as admin)
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: familyId,
          user_id: user.id,
          role: 'admin',
          status: 'active'
        })
        .select();
      
      if (memberError) {
        console.error("Error creating family member record:", memberError);
        throw new Error(`Error creating family member: ${memberError.message}`);
      }
      
      console.log("Created family member:", memberData);
      
      // Try to refresh the materialized view - make multiple attempts
      let refreshSuccessful = false;
      for (let attempt = 0; attempt < 3 && !refreshSuccessful; attempt++) {
        try {
          console.log(`Attempting to refresh materialized view (attempt ${attempt + 1})`);
          await refreshFamilyMembershipsView();
          refreshSuccessful = true;
          console.log("Successfully refreshed materialized view");
        } catch (refreshError) {
          console.warn(`Failed to refresh materialized view (attempt ${attempt + 1}):`, refreshError);
          // Wait briefly before retrying
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      // Even if we couldn't refresh the view, we'll continue
      // Our improved FamilyDashboard component will handle this case

      showSuccessToast('Family created successfully!');
      
      // Short delay to ensure the database has propagated the changes
      setTimeout(() => navigate('/family?created=true'), 800);
    } catch (err) {
      console.error('Error creating family:', err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      
      // Special handling for materialized view errors
      if (errorMessage.includes("REFRESH MATERIALIZED VIEW") || 
          errorMessage.includes("processing other requests") ||
          errorMessage.includes("being used by active queries")) {
        showErrorToast("Family created, but there was a problem updating the database view. Redirecting you now...");
        
        // Navigate to family page anyway with the created=true flag so it will retry fetching
        setTimeout(() => navigate('/family?created=true'), 1500);
        return;
      }
      
      // For other errors, show the standard error message
      setError(errorMessage);
      showErrorToast(`Failed to create family: ${errorMessage}`);
      setViewMode("form");
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
      description: 'Enter details about your family group. This information will be visible to all family members once they join.'
    },
    'family-creation': {
      title: 'Creating a Family',
      description: 'Creating a family group allows you to track finances together with household members. You\'ll be the admin by default.'
    },
    'currency-selection': {
      title: 'Currency Selection',
      description: 'The selected currency will be the default for all family financial calculations and displays.'
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3 text-gray-700">Checking family status...</p>
        </div>
      </div>
    );
  }

  if (existingFamily) {
    return (
      <div className="container-fluid">
        <div className="text-center my-5">
          <div className="alert alert-warning">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            You are already part of a family. You can only belong to one family at a time.
          </div>
          {existingFamilyData && (
            <div className="card mb-4 shadow-sm">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">Your Family</h6>
              </div>
              <div className="card-body">
                <h5 className="font-weight-bold">{existingFamilyData.family_name}</h5>
                {existingFamilyData.description && <p>{existingFamilyData.description}</p>}
              </div>
            </div>
          )}
          <Link to="/family" className="btn btn-primary mt-3">
            <i className="fas fa-arrow-left mr-2"></i> Return to Family Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (viewMode === "review") {
    return (
      <div className="container-fluid animate__animated animate__fadeIn">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Review Family Details</h1>
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
                            <div className="h5 mb-0 font-weight-bold text-gray-800">{familyData.currency_pref}</div>
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
                      <p className="mb-0">{familyData.description}</p>
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
                    <span className="text">{isSubmitting ? "Creating..." : "Create Family"}</span>
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
        <h1 className="h3 mb-0 text-gray-800">Create Family</h1>
        <Link to="/family" className="btn btn-sm btn-secondary shadow-sm">
          <i className="fas fa-arrow-left fa-sm mr-2"></i> Back
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

                <div className="form-group">
                  <label htmlFor="currency_pref" className="font-weight-bold text-gray-800">
                    Currency Preference <span className="text-danger">*</span>
                  </label>
                  <select
                    id="currency_pref"
                    name="currency_pref"
                    value={familyData.currency_pref}
                    onChange={handleChange}
                    className="form-control"
                    required
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="PHP">PHP - Philippine Peso</option>
                  </select>
                  <small className="form-text text-muted">
                    <i 
                      className="fas fa-info-circle mr-1 text-gray-400"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => toggleTip('currency-selection', e)}
                    ></i>
                    Select the currency your family will primarily use.
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
                  <div className="custom-control custom-checkbox">
                    <input
                      type="checkbox"
                      className="custom-control-input"
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
                    <label className="custom-control-label" htmlFor="is_public">
                      Make this family public
                    </label>
                  </div>
                  <small className="form-text text-muted">
                    When enabled, other users can discover and request to join your family.
                  </small>
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
                About Family Groups
                <i 
                  className="fas fa-info-circle ml-1 text-gray-400"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => toggleTip('family-creation', e)}
                ></i>
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(78, 115, 223, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-users text-primary"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Shared Finances</p>
                </div>
                <p className="text-sm ml-5 mb-0">Track and manage household finances together</p>
              </div>

              <div className="mb-3">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(28, 200, 138, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-chart-pie text-success"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Consolidated View</p>
                </div>
                <p className="text-sm ml-5 mb-0">See combined income, expenses and budgets</p>
              </div>

              <div className="mb-0">
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle p-1 mr-3 d-flex align-items-center justify-content-center" style={{ backgroundColor: "rgba(246, 194, 62, 0.2)", width: "32px", height: "32px" }}>
                    <i className="fas fa-flag-checkered text-warning"></i>
                  </div>
                  <p className="font-weight-bold mb-0">Shared Goals</p>
                </div>
                <p className="text-sm ml-5 mb-0">Work together to reach financial milestones</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFamily; 