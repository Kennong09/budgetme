import { useState, useCallback } from 'react';
import { supabase } from '../../../utils/supabaseClient';

interface JoinRequest {
  id: string;
  family_id: string;
  user_id: string;
  status: string;
  requested_at: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
  };
}

interface UseJoinRequestsReturn {
  joinRequests: JoinRequest[];
  pendingJoinRequests: JoinRequest[];
  isLoadingJoinRequests: boolean;
  fetchJoinRequests: (familyId: string) => Promise<void>;
  fetchPendingRequests: (userId: string) => Promise<void>;
  handleJoinRequest: (requestId: string, action: 'approve' | 'reject', familyId: string) => Promise<void>;
  deleteJoinRequest: (requestId: string) => Promise<boolean>;
}

export const useJoinRequests = (
  showErrorToast: (message: string) => void,
  showSuccessToast: (message: string) => void
): UseJoinRequestsReturn => {
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<JoinRequest[]>([]);
  const [isLoadingJoinRequests, setIsLoadingJoinRequests] = useState<boolean>(false);

  const fetchJoinRequests = useCallback(async (familyId: string) => {
    if (!familyId) return;
    
    setIsLoadingJoinRequests(true);
    
    try {
      const { data, error } = await supabase
        .from("join_requests")
        .select(`
          id,
          family_id,
          user_id,
          status,
          requested_at,
          users (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq("family_id", familyId)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching join requests:", error);
        showErrorToast(`Error loading join requests: ${error.message}`);
        return;
      }
      
      const formattedRequests: JoinRequest[] = data?.map(request => ({
        id: request.id,
        family_id: request.family_id,
        user_id: request.user_id,
        status: request.status,
        requested_at: request.requested_at,
        user: request.users ? {
          id: request.users[0]?.id || '',
          email: request.users[0]?.email || '',
          full_name: request.users[0]?.full_name || '',
          avatar_url: request.users[0]?.avatar_url || ''
        } : {
          id: '',
          email: '',
          full_name: '',
          avatar_url: ''
        }
      })) || [];
      
      setJoinRequests(formattedRequests);
    } catch (err) {
      console.error("Error in fetchJoinRequests:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      showErrorToast(`Error loading join requests: ${errorMessage}`);
    } finally {
      setIsLoadingJoinRequests(false);
    }
  }, [showErrorToast]);

  const fetchPendingRequests = useCallback(async (userId: string) => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from("join_requests")
        .select(`
          id,
          family_id,
          user_id,
          status,
          requested_at,
          families (
            id,
            family_name,
            description
          )
        `)
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching pending requests:", error);
        return;
      }
      
      // Format pending requests to match JoinRequest type
      const formattedPending: JoinRequest[] = data?.map(request => ({
        id: request.id,
        family_id: request.family_id,
        user_id: request.user_id,
        status: request.status,
        requested_at: request.requested_at,
        user: {
          id: request.user_id,
          email: '',
          full_name: '',
          avatar_url: ''
        }
      })) || [];
      
      setPendingJoinRequests(formattedPending);
    } catch (err) {
      console.error("Error fetching pending requests:", err);
    }
  }, []);

  const handleJoinRequest = useCallback(async (
    requestId: string,
    action: 'approve' | 'reject',
    familyId: string
  ) => {
    try {
      const { data, error } = await supabase.rpc(
        action === 'approve' ? 'approve_join_request' : 'reject_join_request',
        { p_request_id: requestId }
      );
      
      if (error) {
        console.error(`Error ${action}ing join request:`, error);
        showErrorToast(`Failed to ${action} join request: ${error.message}`);
        return;
      }
      
      showSuccessToast(`Join request ${action}ed successfully`);
      
      // Refresh join requests
      await fetchJoinRequests(familyId);
    } catch (err) {
      console.error(`Error ${action}ing join request:`, err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      showErrorToast(`Failed to ${action} join request: ${errorMessage}`);
    }
  }, [showErrorToast, showSuccessToast, fetchJoinRequests]);

  const deleteJoinRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("join_requests")
        .delete()
        .eq("id", requestId);
        
      if (error) {
        console.error("Error deleting join request:", error);
        showErrorToast(`Failed to delete join request: ${error.message}`);
        return false;
      }
      
      showSuccessToast("Join request deleted successfully");
      return true;
    } catch (err) {
      console.error("Error deleting join request:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      showErrorToast(`Failed to delete join request: ${errorMessage}`);
      return false;
    }
  }, [showErrorToast, showSuccessToast]);

  return {
    joinRequests,
    pendingJoinRequests,
    isLoadingJoinRequests,
    fetchJoinRequests,
    fetchPendingRequests,
    handleJoinRequest,
    deleteJoinRequest
  };
};
