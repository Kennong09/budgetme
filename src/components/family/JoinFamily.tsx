import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
import { joinRequestService } from "../../services/database/joinRequestService";
import { familyService } from "../../services/database/familyService";
import { formatDate } from "../../utils/helpers";

interface JoinFamilyProps {
  onJoinSuccess?: () => void;
}

const JoinFamily: React.FC<JoinFamilyProps> = ({ onJoinSuccess }) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  
  // State for families list
  const [availableFamilies, setAvailableFamilies] = useState<any[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState<boolean>(false);
  const [joiningFamily, setJoiningFamily] = useState<boolean>(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Fetch available families that user can join
  const fetchAvailableFamilies = useCallback(async () => {
    if (!user) return;
    
    setLoadingFamilies(true);
    setHasError(false); // Reset error state when starting fresh
    try {
      // First check if user is already a member of a family (with error handling)
      let isMemberOfFamily = false;
      try {
        const membershipInfo = await familyService.checkFamilyMembership(user.id);
        isMemberOfFamily = membershipInfo.is_member;
        
        // If user is already a member, they can't join another family
        if (isMemberOfFamily) {
          setAvailableFamilies([]);
          showErrorToast("You are already a member of a family. You can only be a member of one family at a time.");
          return;
        }
      } catch (membershipError) {
        console.warn("Error checking family membership, proceeding with family lookup:", membershipError);
        // Continue with family lookup even if membership check fails
      }
      
      const families = await familyService.getPublicFamilies(user.id);
      
      if (families.length === 0) {
        setAvailableFamilies([]);
        return;
      }

      // Get pending join requests for these families (with error handling)
      let pendingFamilyIds = new Set<string>();
      try {
        const userRequests = await joinRequestService.getUserJoinRequests(user.id);
        pendingFamilyIds = new Set(
          userRequests
            .filter(req => req.status === 'pending')
            .map(req => req.family_id)
        );
      } catch (requestError) {
        console.warn("Error fetching user join requests:", requestError);
        // Continue without pending request info
      }
      
      // Enhance families with request status
      const enhancedFamilies = families.map(family => ({
        ...family,
        already_requested: pendingFamilyIds.has(family.id),
        request_status: pendingFamilyIds.has(family.id) ? 'pending' : null
      }));
      
      setAvailableFamilies(enhancedFamilies);
    } catch (err) {
      console.error("Error in fetchAvailableFamilies:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setHasError(true);
      
      // Handle specific error types
      if (errorMessage.includes('406') || errorMessage.includes('Not Acceptable')) {
        showErrorToast("There was an issue loading family data. Please try refreshing or try again later.");
      } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        showErrorToast("Network error. Please check your connection and try again.");
      } else {
        showErrorToast(`Failed to load families: ${errorMessage}`);
      }
      setAvailableFamilies([]);
    } finally {
      setLoadingFamilies(false);
    }
  }, [user, showErrorToast]);

  // Handle family join request
  // Retry mechanism for failed requests
  const retryFetchFamilies = async () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setHasError(false);
      await fetchAvailableFamilies();
    } else {
      showErrorToast("Unable to load families after multiple attempts. Please refresh the page.");
    }
  };

  const handleJoinRequest = async (familyId: string) => {
    if (!user) {
      showErrorToast("You must be logged in to join a family");
      return;
    }
    
    // Check if already requested to prevent duplicate attempts
    const family = availableFamilies.find(f => f.id === familyId);
    if (family?.already_requested) {
      showErrorToast("You have already requested to join this family.");
      return;
    }
    
    setSelectedFamilyId(familyId);
    setJoiningFamily(true);
    
    try {
      await joinRequestService.createJoinRequest(
        {
          family_id: familyId,
          message: "I would like to join your family."
        },
        user.id
      );
      
      // Update local state to reflect the join request
      const updatedFamilies = availableFamilies.map(fam => {
        if (fam.id === familyId) {
          return {
            ...fam,
            already_requested: true,
            request_status: 'pending'
          };
        }
        return fam;
      });
      
      setAvailableFamilies(updatedFamilies);
      showSuccessToast("Join request sent successfully. Waiting for approval.");
      
      // Call the success callback if provided
      if (onJoinSuccess) {
        onJoinSuccess();
      }
      
    } catch (err) {
      console.error("Error in handleJoinRequest:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      
      // Handle specific error types
      if (errorMessage.includes('duplicate key value violates unique constraint')) {
        showErrorToast("You have already requested to join this family.");
        
        // Update local state to reflect existing request
        const updatedFamilies = availableFamilies.map(fam => {
          if (fam.id === familyId) {
            return {
              ...fam,
              already_requested: true,
              request_status: 'pending'
            };
          }
          return fam;
        });
        setAvailableFamilies(updatedFamilies);
      } else if (errorMessage.includes('already a member')) {
        showErrorToast("You are already a member of a family. You can only be a member of one family at a time.");
        // Refresh the families list to reflect current state
        fetchAvailableFamilies();
      } else if (errorMessage.includes('already have a pending request')) {
        showErrorToast("You already have a pending request to join this family.");
        
        // Update local state to reflect existing request
        const updatedFamilies = availableFamilies.map(fam => {
          if (fam.id === familyId) {
            return {
              ...fam,
              already_requested: true,
              request_status: 'pending'
            };
          }
          return fam;
        });
        setAvailableFamilies(updatedFamilies);
      } else {
        showErrorToast(`Failed to send join request: ${errorMessage}`);
      }
    } finally {
      setJoiningFamily(false);
      setSelectedFamilyId(null);
    }
  };

  // Load available families on component mount
  useEffect(() => {
    fetchAvailableFamilies();
  }, [fetchAvailableFamilies]);

  return (
    <div>
      {/* Mobile View */}
      <div className="block md:hidden">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-bold text-gray-800">Available Families</h5>
          <button 
            className="w-8 h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 flex items-center justify-center transition-all active:scale-95" 
            onClick={fetchAvailableFamilies}
            disabled={loadingFamilies}
          >
            <i className={`fas ${loadingFamilies ? "fa-spinner fa-spin" : "fa-sync"} text-xs`}></i>
          </button>
        </div>

        {loadingFamilies ? (
          <div className="py-8 animate__animated animate__fadeIn">
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="mt-3 text-xs text-gray-500 font-medium">Loading families...</p>
            </div>
          </div>
        ) : hasError ? (
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-exclamation-triangle text-amber-500 text-xl"></i>
            </div>
            <h5 className="text-sm font-semibold text-gray-700 mb-1">Failed to Load</h5>
            <p className="text-xs text-gray-500 mb-4">There was an issue loading families.</p>
            <div className="flex justify-center gap-2">
              <button 
                className="px-4 py-2 bg-indigo-500 text-white text-xs font-medium rounded-lg hover:bg-indigo-600 transition-colors" 
                onClick={retryFetchFamilies}
                disabled={loadingFamilies}
              >
                <i className={`fas ${loadingFamilies ? "fa-spinner fa-spin" : "fa-redo"} mr-1`}></i> 
                Try Again {retryCount > 0 && `(${retryCount}/3)`}
              </button>
            </div>
          </div>
        ) : availableFamilies.length > 0 ? (
          <div className="space-y-2">
            {availableFamilies.map(family => (
              <div key={family.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h6 className="text-sm font-bold text-gray-800 truncate">{family.family_name}</h6>
                    <p className="text-[10px] text-gray-500 truncate">{family.description || "No description"}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[9px] font-semibold ml-2 flex-shrink-0">
                    <i className="fas fa-users mr-1"></i>{family.member_count || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[9px] text-gray-400">
                    <i className="fas fa-user mr-1"></i>{family.creator_name || "Unknown"}
                  </div>
                  {family.already_requested ? (
                    <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-lg">
                      <i className="fas fa-clock mr-1"></i>Pending
                    </span>
                  ) : (
                    <button 
                      className="px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-medium rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
                      onClick={() => handleJoinRequest(family.id)}
                      disabled={joiningFamily && selectedFamilyId === family.id}
                    >
                      {joiningFamily && selectedFamilyId === family.id ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-1"></i>
                          Joining...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-sign-in-alt mr-1"></i>
                          Join
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="bg-blue-50 rounded-xl p-3 mt-3">
              <p className="text-[10px] text-blue-600 flex items-start gap-2">
                <i className="fas fa-info-circle mt-0.5"></i>
                <span>Join requests require admin approval. You will join as a member.</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-users text-gray-400 text-xl"></i>
            </div>
            <h5 className="text-sm font-semibold text-gray-600 mb-1">No Families Available</h5>
            <p className="text-xs text-gray-400">No public families to join at the moment.</p>
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="text-gray-700 font-weight-bold mb-0">Available Families</h5>
          <button 
            className="btn btn-sm btn-outline-primary" 
            onClick={fetchAvailableFamilies}
            disabled={loadingFamilies}
          >
            <i className={`fas ${loadingFamilies ? "fa-spinner fa-spin" : "fa-sync"} mr-1`}></i> 
            Refresh
          </button>
        </div>

      {loadingFamilies ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading available families...</p>
        </div>
      ) : hasError ? (
        <div className="text-center py-5">
          <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
          <h5 className="text-gray-600 font-weight-light mb-2">Failed to Load Families</h5>
          <p className="text-gray-500 mb-4 small">There was an issue loading available families. This might be a temporary network issue.</p>
          <div className="d-flex justify-content-center gap-2">
            <button 
              className="btn btn-primary btn-sm" 
              onClick={retryFetchFamilies}
              disabled={loadingFamilies}
            >
              <i className={`fas ${loadingFamilies ? "fa-spinner fa-spin" : "fa-retry"} mr-1`}></i> 
              Try Again {retryCount > 0 && `(${retryCount}/3)`}
            </button>
            <button 
              className="btn btn-outline-secondary btn-sm" 
              onClick={() => window.location.reload()}
            >
              <i className="fas fa-refresh mr-1"></i> 
              Refresh Page
            </button>
          </div>
        </div>
      ) : availableFamilies.length > 0 ? (
        <div className="card shadow">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Family Name</th>
                    <th>Description</th>
                    <th>Created By</th>
                    <th>Members</th>
                    <th>Created On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {availableFamilies.map(family => (
                    <tr key={family.id}>
                      <td className="font-weight-bold">{family.family_name}</td>
                      <td>{family.description || "No description"}</td>
                      <td>{family.creator_name || "Unknown"}</td>
                      <td>
                        <span className="badge badge-info">
                          <i className="fas fa-users mr-1"></i> {family.member_count || 0} members
                        </span>
                      </td>
                      <td>{new Date(family.created_at).toLocaleDateString()}</td>
                      <td>
                        {family.already_requested ? (
                          <button 
                            className="btn btn-sm btn-secondary" 
                            disabled
                          >
                            <i className="fas fa-clock mr-1"></i> Request Pending
                          </button>
                        ) : (
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={() => handleJoinRequest(family.id)}
                            disabled={joiningFamily && selectedFamilyId === family.id}
                          >
                            {joiningFamily && selectedFamilyId === family.id ? (
                              <>
                                <span className="spinner-border spinner-border-sm mr-1" role="status" aria-hidden="true"></span>
                                Joining...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-sign-in-alt mr-1"></i> Request to Join as Member
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card-footer bg-light">
            <small className="text-muted">
              <i className="fas fa-info-circle mr-1"></i>
              Once you request to join, the family admin will need to approve your request. You will join as a member.
            </small>
          </div>
        </div>
      ) : (
        <div className="text-center py-5">
          <i className="fas fa-users fa-3x text-gray-300 mb-3"></i>
          <h5 className="text-gray-500 font-weight-light mb-2">No Families Available to Join</h5>
          <p className="text-gray-500 mb-4 small">There are no public families available for you to join at the moment.</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default JoinFamily; 