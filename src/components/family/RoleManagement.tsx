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
      <div>
        {/* Mobile Loading State */}
        <div className="block md:hidden py-8 animate__animated animate__fadeIn">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading members...</p>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="text-center my-4 hidden md:block">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading family members...</p>
        </div>
      </div>
    );
  }

  if (!state.canManageRoles) {
    return (
      <div>
        {/* Mobile No Permission State */}
        <div className="block md:hidden">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-exclamation-triangle text-amber-500 text-sm"></i>
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-1">No Permission</p>
                <p className="text-[10px] text-amber-600">
                  {state.userRole === 'member' && "Members can participate but cannot manage roles."}
                  {state.userRole === 'viewer' && "Viewers have read-only access."}
                  {!state.userRole && "Only owners and admins can manage roles."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop No Permission State */}
        <div className="alert alert-warning hidden md:block">
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
      </div>
    );
  }

  return (
    <div className="animate__animated animate__fadeIn">
      {/* Mobile View */}
      <div className="block md:hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h6 className="text-sm font-bold text-gray-800">Role Management</h6>
            {state.isOwner && (
              <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-semibold">Owner</span>
            )}
          </div>
        </div>

        {/* Mobile Members List */}
        <div className="space-y-2">
          {state.members.map((member) => {
            const isCurrentUser = member.user_id === user?.id;
            const isMemberOwner = isOwnerMember(member);
            
            return (
              <div key={member.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <img 
                    src={member.avatar_url || "/images/placeholder.png"} 
                    className="w-10 h-10 rounded-full object-cover" 
                    alt={member.full_name || 'Member'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {member.full_name || 'Unknown User'}
                      </p>
                      {isCurrentUser && <span className="text-[9px] text-gray-400">(You)</span>}
                      {isMemberOwner && <i className="fas fa-crown text-amber-500 text-[10px]" title="Owner"></i>}
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">{member.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                      member.role === 'admin' ? 'bg-indigo-100 text-indigo-600' :
                      member.role === 'member' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                    {!isCurrentUser && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openRoleModal(member)}
                          className="w-7 h-7 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-600 flex items-center justify-center transition-all"
                          title="Change Role"
                          disabled={isMemberOwner && !state.isOwner}
                        >
                          <i className="fas fa-user-edit text-[10px]"></i>
                        </button>
                        {state.isOwner && (member.role === 'admin' || member.role === 'member') && (
                          <button
                            onClick={() => openTransferModal(member)}
                            className="w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-600 flex items-center justify-center transition-all"
                            title="Transfer Ownership"
                          >
                            <i className="fas fa-crown text-[10px]"></i>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
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
      </div>

      {/* Role Change Modal */}
      {state.showRoleModal && state.roleChangeTarget && (
        <>
          {/* Mobile Modal */}
          <div className="block md:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={closeModals}>
            <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto animate__animated animate__slideInUp" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-gray-800">Change Role</h5>
                  <button onClick={closeModals} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <i className="fas fa-times text-gray-500 text-xs"></i>
                  </button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-600 mb-3">
                  Change role for <span className="font-semibold">{state.roleChangeTarget.full_name || state.roleChangeTarget.email}</span>
                </p>
                
                <div className="mb-4">
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">New Role</label>
                  <select 
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700"
                    value={state.newRole || ''}
                    onChange={(e) => setState(prev => ({ ...prev, newRole: e.target.value }))}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                
                <div className="bg-blue-50 rounded-xl p-3 mb-4">
                  <p className="text-[10px] font-bold text-blue-700 mb-2">Role Permissions:</p>
                  <div className="space-y-1">
                    <p className="text-[10px] text-blue-600"><span className="font-semibold">Admin:</span> Full management</p>
                    <p className="text-[10px] text-blue-600"><span className="font-semibold">Member:</span> Standard access</p>
                    <p className="text-[10px] text-blue-600"><span className="font-semibold">Viewer:</span> Read-only</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={closeModals} className="flex-1 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl">
                    Cancel
                  </button>
                  <button 
                    onClick={handleRoleChange}
                    disabled={!state.newRole || state.newRole === state.roleChangeTarget.role}
                    className="flex-1 py-3 bg-indigo-500 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                  >
                    Update Role
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Modal */}
          <div className="modal show d-block hidden md:block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
        </>
      )}

      {/* Ownership Transfer Modal */}
      {state.showTransferModal && state.transferTarget && (
        <>
          {/* Mobile Modal */}
          <div className="block md:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={closeModals}>
            <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto animate__animated animate__slideInUp" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-amber-600 flex items-center gap-2">
                    <i className="fas fa-crown"></i>
                    Transfer Ownership
                  </h5>
                  <button onClick={closeModals} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <i className="fas fa-times text-gray-500 text-xs"></i>
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <p className="text-xs text-amber-700 flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>This action cannot be undone!</span>
                  </p>
                </div>
                
                <p className="text-xs text-gray-600 mb-3">Transfer ownership to:</p>
                
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={state.transferTarget.avatar_url || "/images/placeholder.png"} 
                      className="w-12 h-12 rounded-full object-cover" 
                      alt={state.transferTarget.full_name || 'Member'}
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-800">{state.transferTarget.full_name || 'Unknown User'}</p>
                      <p className="text-[10px] text-gray-500">{state.transferTarget.email}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-3 mb-4">
                  <p className="text-[10px] font-bold text-blue-700 mb-2">What happens:</p>
                  <ul className="text-[10px] text-blue-600 space-y-1 list-disc list-inside">
                    <li>They become the new owner</li>
                    <li>They get Admin role</li>
                    <li>You remain as Admin</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <button onClick={closeModals} className="flex-1 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl">
                    Cancel
                  </button>
                  <button 
                    onClick={handleOwnershipTransfer}
                    className="flex-1 py-3 bg-amber-500 text-white text-sm font-medium rounded-xl"
                  >
                    <i className="fas fa-crown mr-2"></i>
                    Transfer
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Modal */}
          <div className="modal show d-block hidden md:block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
        </>
      )}
    </div>
  );
};

export default RoleManagement;