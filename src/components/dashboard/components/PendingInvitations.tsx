import React, { FC } from "react";
import { Invitation } from "../types";

interface PendingInvitationsProps {
  invitations: Invitation[];
  onAcceptInvite: (inviteId: number) => Promise<void>;
  onRejectInvite: (inviteId: number) => Promise<void>;
}

const PendingInvitations: FC<PendingInvitationsProps> = ({
  invitations,
  onAcceptInvite,
  onRejectInvite,
}) => {
  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="alert alert-info shadow-sm animate__animated animate__fadeIn">
      <h4 className="alert-heading">You have pending family invitations!</h4>
      {invitations.map(invite => {
        const inviter = invite.inviter_email || "another user";
        return (
          <div key={invite.id} className="d-flex justify-content-between align-items-center mb-2">
            <p className="mb-0">
              You have been invited by <strong>{inviter}</strong> to join the <strong>{invite.family_name}</strong>.
            </p>
            <div>
              <button 
                className="btn btn-success btn-sm mr-2" 
                onClick={() => onAcceptInvite(invite.id)}
              >
                Accept
              </button>
              <button 
                className="btn btn-danger btn-sm" 
                onClick={() => onRejectInvite(invite.id)}
              >
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PendingInvitations;
