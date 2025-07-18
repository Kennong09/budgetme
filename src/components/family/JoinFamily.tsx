import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/AuthContext";
import { useToast } from "../../utils/ToastContext";
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
      // Step 1: Check if any public families exist at all (for debugging)
      const { count: publicCount, error: countError } = await supabase
        .from('families')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true);
        
      if (countError) {
        console.error("Error checking public family count:", countError);
      }
      
      // Step 2: Get all public families first without any filters
      const { data: allPublicFamilies, error: publicFamiliesError } = await supabase
        .from('families')
        .select('id, family_name, description, currency_pref, created_at, created_by, is_public')
        .eq('is_public', true);
        
      if (publicFamiliesError) {
        console.error("Error fetching public families:", publicFamiliesError);
        setAvailableFamilies([]);
        setLoadingFamilies(false);
        return;
      }
      
      if (!allPublicFamilies || allPublicFamilies.length === 0) {
        setAvailableFamilies([]);
        setLoadingFamilies(false);
        return;
      }

      // Step 2: Get families user is already a member of to exclude them
      const { data: userFamilies, error: userFamiliesError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .eq('status', 'active');
        
      if (userFamiliesError) {
        console.warn("Error checking user family memberships:", userFamiliesError);
        // Continue with showing all public families
      }
      
      // Create a set of family IDs user is already a member of
      const userFamilyIds = new Set(userFamilies?.map(f => f.family_id) || []);
      
      // Filter out families the user is already a member of
      const availablePublicFamilies = allPublicFamilies.filter(family => !userFamilyIds.has(family.id));
      
      if (availablePublicFamilies.length === 0) {
        setAvailableFamilies([]);
        setLoadingFamilies(false);
        return;
      }

      // Step 3: Get family members count - one by one to avoid group issue
      const familyIds = availablePublicFamilies.map(family => family.id);
      
      // Get count for each family separately
      const memberCountMap = new Map();
      
      // For each family, count the members
      for (const familyId of familyIds) {
        try {
          const { count, error } = await supabase
            .from('family_members')
            .select('*', { count: 'exact', head: true })
            .eq('family_id', familyId)
            .eq('status', 'active');
            
          if (error) {
            console.warn(`Error getting member count for family ${familyId}:`, error);
          } else {
            memberCountMap.set(familyId, count || 0);
          }
        } catch (err) {
          console.error(`Error counting members for family ${familyId}:`, err);
        }
      }
      
      // Step 3: Collect all creator IDs
      const creatorIds = availablePublicFamilies.map(family => family.created_by).filter(Boolean);
      
      // Step 4: Fetch profile data for all creators in one query
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, user_metadata')
        .in('id', creatorIds);
        
      if (profilesError) {
        console.warn("Error fetching creator profiles:", profilesError);
        // Continue without profile data
      }
      
      // Create a map of profiles by ID for quick lookup
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }
      
      // Step 5: Check pending join requests
      const { data: pendingRequests, error: requestError } = await supabase
        .from('family_join_requests')
        .select('family_id, status')
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
        .in('family_id', familyIds);
        
      if (requestError) {
        console.error("Error checking pending requests:", requestError);
      }
      
      // Step 6: Combine all the data
      const enhancedData = availablePublicFamilies.map(family => {
        const pending = pendingRequests?.find(req => req.family_id === family.id);
        const creatorProfile = profilesMap.get(family.created_by);
        
        return {
          ...family,
          already_requested: !!pending,
          request_status: pending?.status || null,
          members_count: memberCountMap.get(family.id) || 0,
          creator_email: creatorProfile?.email || "Unknown",
          creator_name: creatorProfile?.user_metadata?.username || 
                        creatorProfile?.user_metadata?.full_name || 
                        "Unknown"
        };
      });
      
      setAvailableFamilies(enhancedData);
    } catch (err) {
      console.error("Error in fetchAvailableFamilies:", err);
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
      // Check if a request already exists (double-check)
      const { data: existingRequest, error: checkError } = await supabase
        .from('family_join_requests')
        .select('id, status')
        .eq('family_id', familyId)
        .eq('user_id', user.id)
        .single();
        
      if (!checkError && existingRequest) {
        // Request already exists
        if (existingRequest.status === 'pending') {
          showErrorToast("You already have a pending request to join this family");
        } else if (existingRequest.status === 'approved') {
          showErrorToast("You're already a member of this family");
        } else {
          showErrorToast("You've already requested to join this family");
        }
        return;
      }

      // Create new join request
      const { data, error } = await supabase
        .from('family_join_requests')
        .insert({
          family_id: familyId,
          user_id: user.id,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select();
        
      if (error) {
        console.error("Error sending join request:", error);
        // Handle specific error cases
        if (error.code === '23505') { // Unique constraint violation
          throw new Error("You've already requested to join this family");
        } else {
          throw new Error(`Failed to send join request: ${error.message}`);
        }
      }
      
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
                          <i className="fas fa-users mr-1"></i> {family.members_count || 0} members
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