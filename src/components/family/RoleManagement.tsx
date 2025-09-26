import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { useToast } from '../../utils/ToastContext';
import { familyService, FamilyMember } from '../../services/database/familyService';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface RoleManagementProps {
  familyId: string;
  onUpdate?: () => void;
}

interface RoleManagementState {
  members: FamilyMember[];
  loading: boolean;
  canManageRoles: boolean;
  isOwner: boolean;
  userRole?: string;
  showTransferModal: boolean;
  transferTarget?: FamilyMember;
  showRoleModal: boolean;
  roleChangeTarget?: FamilyMember;
  newRole?: string;
}

const RoleManagement: React.FC<RoleManagementProps> = ({ familyId, onUpdate }) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [state, setState] = useState<RoleManagementState>({
    members: [],
    loading: true,
    canManageRoles: false,
    isOwner: false,
    showTransferModal: false,
    showRoleModal: false
  });

  // Load family members and permissions
  useEffect(() => {
    loadFamilyData();
  }, [familyId, user]);

  const loadFamilyData = async () => {
    if (!user || !familyId) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Load members and check permissions
      const [members, permissions] = await Promise.all([
        familyService.getFamilyMembers(familyId),
        familyService.canManageRoles(familyId, user.id)
      ]);

      setState(prev => ({
        ...prev,
        members,
        canManageRoles: permissions.canManage,
        isOwner: permissions.isOwner,
        userRole: permissions.role,
        loading: false
      }));
    } catch (error) {
      console.error('Error loading family data:', error);
      showErrorToast('Failed to load family members');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRoleChange = async () => {
    if (!user || !state.roleChangeTarget || !state.newRole) return;

    try {
      await familyService.updateMemberRole(
        familyId,
        state.roleChangeTarget.user_id,
        state.newRole,
        user.id
      );

      showSuccessToast(`Successfully updated ${state.roleChangeTarget.full_name || state.roleChangeTarget.email} to ${state.newRole}`);
      
      // Refresh data
      await loadFamilyData();
      
      // Close modal
      setState(prev => ({
        ...prev,
        showRoleModal: false,
        roleChangeTarget: undefined,
        newRole: undefined
      }));
      
      // Notify parent component
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role';
      showErrorToast(errorMessage);
    }
  };

  const handleOwnershipTransfer = async () => {
    if (!user || !state.transferTarget) return;

    try {
      await familyService.transferOwnership(
        familyId,
        state.transferTarget.user_id,
        user.id
      );

      showSuccessToast(`Successfully transferred ownership to ${state.transferTarget.full_name || state.transferTarget.email}`);
      
      // Refresh data
      await loadFamilyData();
      
      // Close modal
      setState(prev => ({
        ...prev,
        showTransferModal: false,
        transferTarget: undefined
      }));
      
      // Notify parent component
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error transferring ownership:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transfer ownership';
      showErrorToast(errorMessage);
    }
  };

  const openRoleModal = (member: FamilyMember) => {
    setState(prev => ({
      ...prev,
      showRoleModal: true,
      roleChangeTarget: member,
      newRole: member.role
    }));
  };

  const openTransferModal = (member: FamilyMember) => {
    setState(prev => ({
      ...prev,
      showTransferModal: true,
      transferTarget: member
    }));
  };

  const closeModals = () => {
    setState(prev => ({
      ...prev,
      showRoleModal: false,
      showTransferModal: false,
      roleChangeTarget: undefined,
      transferTarget: undefined,
      newRole: undefined
    }));
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'badge-primary';
      case 'member': return 'badge-success';
      case 'viewer': return 'badge-secondary';
      default: return 'badge-light';
    }
  };

  const isOwnerMember = (member: FamilyMember) => {
    // We'll need to get this info from the family table or pass it as prop
    // For now, assume the first admin is the owner (this should be improved)
    return member.role === 'admin' && state.members.indexOf(member) === 0;
  };

  if (state.loading) {
    return (
      <div className="text-center my-4">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading family members...</p>
      </div>
    );
  }

  if (!state.canManageRoles) {
    return (
      <div className="alert alert-warning">
        <i className="fas fa-exclamation-triangle mr-2"></i>
        You don't have permission to manage family roles.
        {state.userRole === 'member' && (
          <div className="mt-2 small">
            <strong>Members</strong> can participate in family activities but cannot manage roles.
            Only family owners and admins can assign roles.
          </div>
        )}
        {state.userRole === 'viewer' && (
          <div className="mt-2 small">
            <strong>Viewers</strong> have read-only access and cannot manage roles.
            Only family owners and admins can assign roles.
          </div>
        )}
        {!state.userRole && (
          <div className="mt-2 small">
            Only family owners and admins can manage roles.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate__animated animate__fadeIn">
      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">
            <i className="fas fa-users-cog mr-2"></i>
            Role Management
            {state.isOwner && (
              <span className="badge badge-warning ml-2">Owner</span>
            )}
          </h6>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Current Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.members.map((member) => {
                  const isCurrentUser = member.user_id === user?.id;
                  const isMemberOwner = isOwnerMember(member);
                  
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <img 
                            src={member.avatar_url || "/images/placeholder.png"} 
                            className="rounded-circle mr-3" 
                            width="40" 
                            height="40"
                            alt={member.full_name || 'Member'}
                          />
                          <div>
                            <div className="font-weight-bold">
                              {member.full_name || 'Unknown User'}
                              {isCurrentUser && <span className="text-muted ml-1">(You)</span>}
                              {isMemberOwner && <i className="fas fa-crown text-warning ml-2" title="Family Owner"></i>}
                            </div>
                            <div className="text-muted small">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getRoleBadgeClass(member.role)} p-2`}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">
                          {new Date(member.joined_at).toLocaleDateString()}
                        </small>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          {/* Role Change Button */}
                          {!isCurrentUser && (
                            <button
                              onClick={() => openRoleModal(member)}
                              className="btn btn-outline-primary"
                              title="Change Role"
                              disabled={isMemberOwner && !state.isOwner}
                            >
                              <i className="fas fa-user-edit"></i>
                            </button>
                          )}
                          
                          {/* Transfer Ownership Button - Only for owner */}
                          {state.isOwner && !isCurrentUser && (member.role === 'admin' || member.role === 'member') && (
                            <button
                              onClick={() => openTransferModal(member)}
                              className="btn btn-outline-warning"
                              title="Transfer Ownership"
                            >
                              <i className="fas fa-crown"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Role Change Modal */}
      {state.showRoleModal && state.roleChangeTarget && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Change Role</h5>
                <button type="button" className="close" onClick={closeModals}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>Change role for <strong>{state.roleChangeTarget.full_name || state.roleChangeTarget.email}</strong>:</p>
                
                <div className="form-group">
                  <label>New Role:</label>
                  <select 
                    className="form-control"
                    value={state.newRole || ''}
                    onChange={(e) => setState(prev => ({ ...prev, newRole: e.target.value }))}
                  >
                    <option value="admin">Admin - Full management privileges</option>
                    <option value="member">Member - Standard privileges</option>
                    <option value="viewer">Viewer - Read-only access</option>
                  </select>
                </div>
                
                <div className="alert alert-info small">
                  <strong>Role Descriptions:</strong>
                  <ul className="mb-0 mt-2">
                    <li><strong>Admin:</strong> Can invite members, manage roles, and access all family data</li>
                    <li><strong>Member:</strong> Can contribute to goals and view most family information</li>
                    <li><strong>Viewer:</strong> Limited read-only access to family information</li>
                  </ul>
                  {!state.isOwner && (
                    <div className="mt-2 p-2 bg-warning text-dark rounded">
                      <small>
                        <strong>Admin Restrictions:</strong> You cannot manage the family owner or transfer ownership.
                        Only the owner can change ownership or demote themselves.
                      </small>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleRoleChange}
                  disabled={!state.newRole || state.newRole === state.roleChangeTarget.role}
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ownership Transfer Modal */}
      {state.showTransferModal && state.transferTarget && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-warning">
                  <i className="fas fa-crown mr-2"></i>
                  Transfer Ownership
                </h5>
                <button type="button" className="close" onClick={closeModals}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  <strong>Warning:</strong> This action cannot be undone!
                </div>
                
                <p>You are about to transfer ownership of this family to:</p>
                
                <div className="card bg-light mb-3">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <img 
                        src={state.transferTarget.avatar_url || "/images/placeholder.png"} 
                        className="rounded-circle mr-3" 
                        width="50" 
                        height="50"
                        alt={state.transferTarget.full_name || 'Member'}
                      />
                      <div>
                        <div className="font-weight-bold h5 mb-1">
                          {state.transferTarget.full_name || 'Unknown User'}
                        </div>
                        <div className="text-muted">{state.transferTarget.email}</div>
                        <span className={`badge ${getRoleBadgeClass(state.transferTarget.role)} mt-1`}>
                          Current: {state.transferTarget.role.charAt(0).toUpperCase() + state.transferTarget.role.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="alert alert-info">
                  <h6>What happens after transfer:</h6>
                  <ul className="mb-0">
                    <li>The selected member becomes the new family owner</li>
                    <li>They will automatically be promoted to Admin role</li>
                    <li>You will remain in the family as an Admin</li>
                    <li>The new owner will have full control over the family</li>
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning"
                  onClick={handleOwnershipTransfer}
                >
                  <i className="fas fa-crown mr-2"></i>
                  Transfer Ownership
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;