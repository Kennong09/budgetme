import React from 'react';
import { Link } from 'react-router-dom';
import { FamilyMember, Family } from '../types';
import { formatDate } from '../../../utils/helpers';
import JoinRequestsSection from '../components/JoinRequestsSection';

interface ExtendedFamilyMember extends FamilyMember {
  created_at?: string;
  user?: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at?: string;
    user_metadata?: {
      username?: string;
      full_name?: string;
      avatar_url?: string;
    };
  };
}

interface MembersTabProps {
  isCreator: boolean;
  familyData: Family | null;
  members: ExtendedFamilyMember[];
  getMemberRoleBadge: (role: "admin" | "viewer", isOwner?: boolean) => React.ReactNode;
  familyId?: string;
}

const MembersTab: React.FC<MembersTabProps> = ({
  isCreator,
  familyData,
  members,
  getMemberRoleBadge,
  familyId
}) => {
  return (
    <div className="animate__animated animate__fadeIn">
      {/* Pending Join Requests Section (only visible to admins) */}
      {isCreator && familyData && (
        <JoinRequestsSection familyId={familyData.id} />
      )}

      <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
        <h5 className="text-primary font-weight-bold">Family Members</h5>
        <Link to={`/family/${familyId}/invite`} className="btn btn-sm btn-primary">
          <i className="fas fa-user-plus mr-2"></i> Invite Member
        </Link>
      </div>
      
      {members.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-bordered" width="100%" cellSpacing="0">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Join Date</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <img 
                        className="img-profile rounded-circle mr-3" 
                        src={member.user?.user_metadata?.avatar_url || `../images/placeholder.png`} 
                        alt={member.user?.user_metadata?.username || member.user?.user_metadata?.full_name || "User"} 
                        width="40" 
                        height="40" 
                      />
                      <div>
                        <div className="font-weight-bold">
                          {member.user?.user_metadata?.username || member.user?.user_metadata?.full_name || "User"}
                        </div>
                        <div className="small text-gray-600">{member.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{getMemberRoleBadge(member.role, familyData ? member.user_id === familyData.created_by : false)}</td>
                  <td>{member.created_at ? formatDate(member.created_at) : "N/A"}</td>
                  <td>{member.user?.last_sign_in_at ? formatDate(member.user.last_sign_in_at) : "Never"}</td>
                  <td>
                    <button className="btn btn-danger btn-circle btn-sm">
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center p-4">
          <div className="mb-3">
            <i className="fas fa-users fa-3x text-gray-300"></i>
          </div>
          <h5 className="text-gray-500 font-weight-light">No family members yet</h5>
          <p className="text-gray-500 mb-0 small">
            Invite your family members to join and collaborate on your finances.
          </p>
          <Link to={`/family/${familyId}/invite`} className="btn btn-sm btn-primary mt-3">
            <i className="fas fa-user-plus fa-sm mr-1"></i> Invite Family Member
          </Link>
        </div>
      )}
    </div>
  );
};

export default MembersTab;
