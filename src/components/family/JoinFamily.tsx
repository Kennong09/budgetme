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

  // Fetch available families that user can join
  const fetchAvailableFamilies = useCallback(async () => {
    if (!user) return;
    
    setLoadingFamilies(true);
    try {
      const families = await familyService.getPublicFamilies(user.id);
      
      if (families.length === 0) {
        setAvailableFamilies([]);
        setLoadingFamilies(false);
        return;
      }

      // Get pending join requests for these families
      const userRequests = await joinRequestService.getUserJoinRequests(user.id);
      const pendingFamilyIds = new Set(
        userRequests
          .filter(req => req.status === 'pending')
          .map(req => req.family_id)
      );
      
      // Enhance families with request status
      const enhancedFamilies = families.map(family => ({
        ...family,
        already_requested: pendingFamilyIds.has(family.id),
        request_status: pendingFamilyIds.has(family.id) ? 'pending' : null
      }));
      
      setAvailableFamilies(enhancedFamilies);
    } catch (err) {
      console.error("Error in fetchAvailableFamilies:", err);
      showErrorToast(`Failed to load families: ${err instanceof Error ? err.message : "Unknown error"}`);
      setAvailableFamilies([]);
    } finally {
      setLoadingFamilies(false);
    }
  }, [user, showErrorToast]);

  // Handle family join request
  const handleJoinRequest = async (familyId: string) => {
    if (!user) {
      showErrorToast("You must be logged in to join a family");
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
      const updatedFamilies = availableFamilies.map(family => {
        if (family.id === familyId) {
          return {
            ...family,
            already_requested: true,
            request_status: 'pending'
          };
        }
        return family;
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
      showErrorToast(errorMessage);
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
                                <i className="fas fa-sign-in-alt mr-1"></i> Request to Join as Viewer
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
              Once you request to join, the family admin will need to approve your request. You will join as a viewer member.
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
  );
};

export default JoinFamily; 