import React, { FC, useState } from "react";
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
  const [expandedMobile, setExpandedMobile] = useState(false);

  if (invitations.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile Invitations - Collapsible card with swipe actions */}
      <div className="block md:hidden mb-3 animate__animated animate__fadeIn">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm overflow-hidden border border-blue-100">
          {/* Header - Always visible */}
          <button
            onClick={() => setExpandedMobile(!expandedMobile)}
            className="w-full p-3 flex items-center justify-between bg-transparent border-0"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <i className="fas fa-envelope text-white text-xs"></i>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-blue-600 font-medium">Family Invitations</p>
                <p className="text-xs font-bold text-gray-800">{invitations.length} pending</p>
              </div>
            </div>
            <i className={`fas fa-chevron-${expandedMobile ? 'up' : 'down'} text-blue-500 text-xs transition-transform`}></i>
          </button>

          {/* Expandable content */}
          {expandedMobile && (
            <div className="px-3 pb-3 space-y-2 animate__animated animate__fadeIn">
              {invitations.map(invite => {
                const inviter = invite.inviter_email || "another user";
                return (
                  <div 
                    key={invite.id} 
                    className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                        <i className="fas fa-users text-indigo-500 text-[10px]"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 truncate">{inviter}</p>
                        <p className="text-xs font-semibold text-gray-800 truncate">{invite.family_name}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className="flex-1 py-1.5 px-2 bg-green-500 hover:bg-green-600 text-white text-[10px] font-medium rounded-lg flex items-center justify-center gap-1 transition-colors"
                        onClick={() => onAcceptInvite(invite.id)}
                      >
                        <i className="fas fa-check text-[8px]"></i>
                        Accept
                      </button>
                      <button 
                        className="flex-1 py-1.5 px-2 bg-red-500 hover:bg-red-600 text-white text-[10px] font-medium rounded-lg flex items-center justify-center gap-1 transition-colors"
                        onClick={() => onRejectInvite(invite.id)}
                      >
                        <i className="fas fa-times text-[8px]"></i>
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Invitations - Original style */}
      <div className="alert alert-info shadow-sm animate__animated animate__fadeIn mb-3 hidden md:block">
        <h4 className="alert-heading h5">Pending Invitations</h4>
        {invitations.map(invite => {
          const inviter = invite.inviter_email || "another user";
          return (
            <div key={invite.id} className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
              <p className="mb-0 small">
                You have been invited by <strong>{inviter}</strong> to join the <strong>{invite.family_name}</strong>
              </p>
              <div className="d-flex gap-2">
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
    </>
  );
};

export default PendingInvitations;
