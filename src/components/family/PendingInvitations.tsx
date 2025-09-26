import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { useToast } from '../../utils/ToastContext';
import { invitationService, InvitationWithDetails } from '../../services/database/invitationService';

interface PendingInvitationsProps {
  onAcceptSuccess: () => void;
}

const PendingInvitations: React.FC<PendingInvitationsProps> = ({ onAcceptSuccess }) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending invitations
  const fetchInvitations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const pendingInvitations = await invitationService.getPendingInvitations(user.id);
      setInvitations(pendingInvitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      showErrorToast('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  // Accept invitation
  const handleAcceptInvitation = async (invitationId: string) => {
    if (!user) return;
    
    try {
      setProcessingId(invitationId);
      await invitationService.acceptInvitation(invitationId, user.id);
      showSuccessToast('Invitation accepted! Welcome to the family!');
      onAcceptSuccess();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept invitation';
      showErrorToast(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  // Decline invitation
  const handleDeclineInvitation = async (invitationId: string) => {
    if (!user) return;
    
    try {
      setProcessingId(invitationId);
      await invitationService.declineInvitation(invitationId, user.id);
      showSuccessToast('Invitation declined');
      // Refresh invitations list
      await fetchInvitations();
    } catch (error) {
      console.error('Error declining invitation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to decline invitation';
      showErrorToast(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-danger">Admin</span>;
      case 'member':
        return <span className="badge badge-primary">Member</span>;
      case 'viewer':
        return <span className="badge badge-secondary">Viewer</span>;
      default:
        return <span className="badge badge-light">{role}</span>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if invitation is expired
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  useEffect(() => {
    fetchInvitations();
  }, [user]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-2 text-gray-600">Loading your invitations...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="text-gray-800 mb-2">Family Invitations</h3>
          <p className="text-gray-600 mb-0">
            You have {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button 
          className="btn btn-sm btn-outline-primary" 
          onClick={fetchInvitations}
          disabled={loading}
        >
          <i className={`fas ${loading ? "fa-spinner fa-spin" : "fa-sync"} mr-1`}></i> 
          Refresh
        </button>
      </div>

      {invitations.length === 0 ? (
        <div className="text-center py-5">
          <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
               style={{ width: "80px", height: "80px", backgroundColor: "rgba(108, 117, 125, 0.1)" }}>
            <i className="fas fa-envelope-open fa-2x text-gray-400" />
          </div>
          <h5 className="text-gray-500 font-weight-light mb-2">No Pending Invitations</h5>
          <p className="text-gray-500 mb-4">
            You don't have any family invitations at the moment. 
            Ask a family member to invite you or look for public families to join.
          </p>
        </div>
      ) : (
        <div className="row">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="col-md-6 mb-4">
              <div className={`card h-100 shadow-sm ${isExpired(invitation.expires_at) ? 'border-warning' : 'border-primary'}`}>
                <div className="card-header bg-light border-0">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0 text-primary">
                      <i className="fas fa-home mr-2"></i>
                      {invitation.family_name || 'Unknown Family'}
                    </h5>
                    {getRoleBadge(invitation.role)}
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">
                      <i className="fas fa-user mr-1"></i>
                      Invited by: <strong>{invitation.inviter_name}</strong>
                    </small>
                    {invitation.inviter_email && (
                      <small className="text-muted d-block">
                        <i className="fas fa-envelope mr-1"></i>
                        {invitation.inviter_email}
                      </small>
                    )}
                  </div>

                  {invitation.message && (
                    <div className="mb-3">
                      <small className="text-muted d-block mb-1">Message:</small>
                      <p className="small text-gray-700 mb-0 p-2 bg-light rounded">
                        "{invitation.message}"
                      </p>
                    </div>
                  )}

                  <div className="mb-3">
                    <small className="text-muted d-block">
                      <i className="fas fa-calendar mr-1"></i>
                      Invited: {formatDate(invitation.created_at)}
                    </small>
                    <small className={`d-block ${isExpired(invitation.expires_at) ? 'text-warning' : 'text-muted'}`}>
                      <i className="fas fa-clock mr-1"></i>
                      {isExpired(invitation.expires_at) ? 'Expired' : 'Expires'}: {formatDate(invitation.expires_at)}
                    </small>
                  </div>

                  {isExpired(invitation.expires_at) && (
                    <div className="alert alert-warning py-2 mb-3">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      <small>This invitation has expired. Contact the family admin for a new invitation.</small>
                    </div>
                  )}
                </div>

                <div className="card-footer bg-white border-0">
                  {!isExpired(invitation.expires_at) ? (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-success btn-sm flex-fill"
                        onClick={() => handleAcceptInvitation(invitation.id)}
                        disabled={processingId === invitation.id}
                      >
                        {processingId === invitation.id ? (
                          <>
                            <span className="spinner-border spinner-border-sm mr-1" role="status" aria-hidden="true"></span>
                            Accepting...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check mr-1"></i>
                            Accept
                          </>
                        )}
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm flex-fill"
                        onClick={() => handleDeclineInvitation(invitation.id)}
                        disabled={processingId === invitation.id}
                      >
                        {processingId === invitation.id ? (
                          <>
                            <span className="spinner-border spinner-border-sm mr-1" role="status" aria-hidden="true"></span>
                            Declining...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-times mr-1"></i>
                            Decline
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm w-100" disabled>
                      <i className="fas fa-ban mr-1"></i>
                      Invitation Expired
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingInvitations;