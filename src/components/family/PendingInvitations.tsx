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
      <div>
        {/* Mobile Loading State */}
        <div className="block md:hidden py-8 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading invitations...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="text-center py-5 hidden md:block">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading your invitations...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile View */}
      <div className="block md:hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Invitations</h3>
            <p className="text-[10px] text-gray-500">
              {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button 
            className="w-8 h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 flex items-center justify-center transition-all active:scale-95" 
            onClick={fetchInvitations}
            disabled={loading}
          >
            <i className={`fas ${loading ? "fa-spinner fa-spin" : "fa-sync"} text-xs`}></i>
          </button>
        </div>

        {invitations.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-envelope-open text-gray-400 text-xl"></i>
            </div>
            <h5 className="text-sm font-semibold text-gray-600 mb-1">No Invitations</h5>
            <p className="text-xs text-gray-400">You don't have any pending invitations.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div 
                key={invitation.id} 
                className={`bg-white rounded-xl p-4 shadow-sm border ${
                  isExpired(invitation.expires_at) ? 'border-amber-200' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <i className="fas fa-home text-indigo-500 text-sm"></i>
                    </div>
                    <div>
                      <h6 className="text-sm font-bold text-gray-800">{invitation.family_name || 'Unknown Family'}</h6>
                      <p className="text-[10px] text-gray-500">From: {invitation.inviter_name}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                    invitation.role === 'admin' ? 'bg-rose-100 text-rose-600' :
                    invitation.role === 'member' ? 'bg-indigo-100 text-indigo-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                  </span>
                </div>

                {invitation.message && (
                  <div className="bg-gray-50 rounded-lg p-2 mb-3">
                    <p className="text-[10px] text-gray-600 italic">"{invitation.message}"</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-[9px] text-gray-400 mb-3">
                  <span><i className="fas fa-calendar mr-1"></i>{formatDate(invitation.created_at)}</span>
                  <span className={isExpired(invitation.expires_at) ? 'text-amber-500' : ''}>
                    <i className="fas fa-clock mr-1"></i>
                    {isExpired(invitation.expires_at) ? 'Expired' : 'Expires'}: {formatDate(invitation.expires_at)}
                  </span>
                </div>

                {isExpired(invitation.expires_at) ? (
                  <div className="bg-amber-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-amber-600">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      Invitation expired. Contact admin for a new one.
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      className="flex-1 py-2 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      disabled={processingId === invitation.id}
                    >
                      {processingId === invitation.id ? (
                        <><i className="fas fa-spinner fa-spin mr-1"></i>Accepting...</>
                      ) : (
                        <><i className="fas fa-check mr-1"></i>Accept</>
                      )}
                    </button>
                    <button
                      className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                      onClick={() => handleDeclineInvitation(invitation.id)}
                      disabled={processingId === invitation.id}
                    >
                      {processingId === invitation.id ? (
                        <><i className="fas fa-spinner fa-spin mr-1"></i>Declining...</>
                      ) : (
                        <><i className="fas fa-times mr-1"></i>Decline</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
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
    </div>
  );
};

export default PendingInvitations;