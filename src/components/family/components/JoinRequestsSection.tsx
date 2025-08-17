import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast } from '../../../utils/ToastContext';
import { formatDate } from '../../../utils/helpers';

interface JoinRequestsSectionProps {
  familyId: string | undefined;
}

const JoinRequestsSection: React.FC<JoinRequestsSectionProps> = ({ familyId }) => {
  const { showSuccessToast, showErrorToast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [fetchDisabled, setFetchDisabled] = useState<boolean>(false);
  
  // Fetch pending join requests
  const fetchPendingRequests = useCallback(async () => {
    if (!familyId || fetchDisabled) return;
    
    // Prevent multiple simultaneous requests
    if (loadingRequests) return;
    
    // Implement rate limiting - only fetch once every 5 seconds
    const now = Date.now();
    if (now - lastFetchTime < 5000 && lastFetchTime !== 0) {
      return;
    }
    
    setLastFetchTime(now);
    setLoadingRequests(true);
    
    try {
      // First, get the join requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('family_join_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (requestsError) {
        const newErrorCount = errorCount + 1;
        setErrorCount(newErrorCount);
        console.error("Error fetching join requests:", requestsError);
        
        // Only show toast on first few errors to avoid spamming
        if (newErrorCount < 3) {
          showErrorToast("Failed to load join requests");
        }
        
        // After too many errors, disable fetching completely
        if (newErrorCount >= 5) {
          setFetchDisabled(true);
          console.log("Disabled join requests fetching due to too many errors");
        }
        
        setPendingRequests([]);
        return;
      }

      // If we have requests, fetch the associated user profiles separately
      if (requestsData && requestsData.length > 0) {
        const userIds = requestsData.map(req => req.user_id).filter(Boolean);
        
        // Only proceed if we have valid user IDs
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, user_metadata')
            .in('id', userIds);
            
          if (profilesError) {
            console.error("Error fetching user profiles:", profilesError);
            // Continue with the requests data even if profiles can't be fetched
          }
          
          // Combine the data
          const combinedData = requestsData.map(request => {
            const profile = profilesData?.find(profile => profile.id === request.user_id);
            return {
              ...request,
              profiles: profile
            };
          });
          
          setPendingRequests(combinedData || []);
        } else {
          setPendingRequests(requestsData);
        }
      } else {
        setPendingRequests([]);
      }
      
      // Reset error count on success
      setErrorCount(0);
    } catch (err) {
      const newErrorCount = errorCount + 1;
      setErrorCount(newErrorCount);
      console.error("Error in fetchPendingRequests:", err);
      
      // Only show toast on first few errors to avoid spamming
      if (newErrorCount < 3) {
        showErrorToast("An error occurred while loading join requests");
      }
      
      // After too many errors, disable fetching completely
      if (newErrorCount >= 5) {
        setFetchDisabled(true);
        console.log("Disabled join requests fetching due to too many errors");
      }
      
      setPendingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [familyId, showErrorToast, loadingRequests, errorCount, lastFetchTime, fetchDisabled]);
  
  // Handle approving or rejecting a join request
  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    if (!familyId) return;
    
    setProcessingRequestId(requestId);
    try {
      // Find the request to process
      const request = pendingRequests.find(req => req.id === requestId);
      if (!request) {
        throw new Error("Request not found");
      }
      
      if (action === 'approve') {
        // First create a family member entry
        const { error: memberError } = await supabase
          .from('family_members')
          .insert({
            family_id: familyId,
            user_id: request.user_id,
            role: 'viewer', // Default role for joined members
            status: 'active',
            created_at: new Date().toISOString()
          });
          
        if (memberError) {
          throw new Error(`Error adding family member: ${memberError.message}`);
        }
        
        // Then update the request status
        const { error: requestError } = await supabase
          .from('family_join_requests')
          .update({ 
            status: 'approved',
            processed_at: new Date().toISOString()
          })
          .eq('id', requestId);
          
        if (requestError) {
          throw new Error(`Error updating request status: ${requestError.message}`);
        }
        
        showSuccessToast("Join request approved successfully! User added as a viewer.");
      } else {
        // Update request status to rejected
        const { error: requestError } = await supabase
          .from('family_join_requests')
          .update({ 
            status: 'rejected',
            processed_at: new Date().toISOString()
          })
          .eq('id', requestId);
          
        if (requestError) {
          throw new Error(`Error updating request status: ${requestError.message}`);
        }
        
        showSuccessToast("Join request rejected");
      }
      
      // Refresh the pending requests list
      fetchPendingRequests();
      
    } catch (err) {
      console.error(`Error ${action}ing request:`, err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showErrorToast(`Failed to ${action} request: ${errorMessage}`);
    } finally {
      setProcessingRequestId(null);
    }
  };
  
  // Load pending requests on component mount - with debounce
  useEffect(() => {
    // Only fetch on initial mount with a delay
    const timer = setTimeout(() => {
      fetchPendingRequests();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (loadingRequests) {
    return (
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-primary">Pending Join Requests</h6>
        </div>
        <div className="card-body text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading pending requests...</p>
        </div>
      </div>
    );
  }
  
  if (pendingRequests.length === 0) {
    return (
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-primary">Pending Join Requests</h6>
          <button 
            className="btn btn-sm btn-outline-primary" 
            onClick={fetchPendingRequests} 
            disabled={fetchDisabled}
            title={fetchDisabled ? "Refresh disabled due to errors" : "Refresh"}
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
        <div className="card-body text-center py-4">
          <i className="fas fa-check-circle fa-2x text-success mb-3"></i>
          <p className="text-gray-500">No pending join requests at this time.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card shadow mb-4">
      <div className="card-header py-3 d-flex justify-content-between align-items-center">
        <h6 className="m-0 font-weight-bold text-primary">
          Pending Join Requests <span className="badge badge-warning ml-2">{pendingRequests.length}</span>
          <small className="ml-2 text-muted font-weight-normal">
            (All approved users join as viewers)
          </small>
        </h6>
        <button 
          className="btn btn-sm btn-outline-primary" 
          onClick={fetchPendingRequests} 
          title="Refresh"
        >
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Requested On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map(request => (
                <tr key={request.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <img 
                        className="img-profile rounded-circle mr-3" 
                        src={request.profiles?.user_metadata?.avatar_url || `../images/placeholder.png`} 
                        width="40" 
                        height="40" 
                        alt="User" 
                      />
                      <div className="font-weight-bold">
                        {request.profiles?.user_metadata?.username || 
                         request.profiles?.user_metadata?.full_name || 
                         "User"}
                      </div>
                    </div>
                  </td>
                  <td>{request.profiles?.email || "Unknown"}</td>
                  <td>{formatDate(request.created_at)}</td>
                  <td>
                    <button 
                      className="btn btn-success btn-sm mr-2" 
                      onClick={() => handleRequestAction(request.id, 'approve')}
                      disabled={processingRequestId === request.id}
                      title="Approve request and add user as a viewer"
                    >
                      {processingRequestId === request.id ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        <i className="fas fa-check mr-1"></i>
                      )}
                      Approve as Viewer
                    </button>
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleRequestAction(request.id, 'reject')}
                      disabled={processingRequestId === request.id}
                    >
                      <i className="fas fa-times mr-1"></i> Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default JoinRequestsSection;
