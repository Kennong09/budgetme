import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FamilyMember, Family } from '../types';
import { formatDate } from '../../../utils/helpers';
import JoinRequestsSection from '../components/JoinRequestsSection';
import { useAuth } from '../../../utils/AuthContext';
import { useToast } from '../../../utils/ToastContext';
import { familyService } from '../../../services/database/familyService';

// Import SB Admin CSS
import "startbootstrap-sb-admin-2/css/sb-admin-2.min.css";
import "animate.css";

interface MembersTabProps {
  isCreator: boolean;
  familyData: Family | null;
  members: FamilyMember[];
  getMemberRoleBadge: (role: "admin" | "member" | "viewer", isOwner?: boolean) => React.ReactNode;
  familyId?: string;
  onMembersUpdate?: () => void;
}

interface RoleManagementState {
  showRoleModal: boolean;
  showTransferModal: boolean;
  showDeleteModal: boolean;
  showLeaveModal: boolean;
  showAssignFeaturesModal: boolean;
  targetMember?: FamilyMember;
  newRole?: string;
  canManageRoles: boolean;
  isOwner: boolean;
  userRole?: string;
  deleteConfirmed: boolean;
}

const MembersTab: React.FC<MembersTabProps> = ({
  isCreator,
  familyData,
  members,
  getMemberRoleBadge,
  familyId,
  onMembersUpdate
}) => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [roleState, setRoleState] = useState<RoleManagementState>({
    showRoleModal: false,
    showTransferModal: false,
    showDeleteModal: false,
    showLeaveModal: false,
    showAssignFeaturesModal: false,
    canManageRoles: false,
    isOwner: false,
    deleteConfirmed: false
  });

  // Load permissions when component mounts or user changes
  useEffect(() => {
    loadPermissions();
  }, [familyId, user]);

  const loadPermissions = async () => {
    if (!user || !familyId) return;

    try {
      const permissions = await familyService.canManageRoles(familyId, user.id);
      setRoleState(prev => ({
        ...prev,
        canManageRoles: permissions.canManage,
        isOwner: permissions.isOwner,
        userRole: permissions.role
      }));
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const handleRoleChange = async () => {
    if (!user || !roleState.targetMember || !roleState.newRole || !familyId) return;

    try {
      await familyService.updateMemberRole(
        familyId,
        roleState.targetMember.user_id,
        roleState.newRole,
        user.id
      );

      showSuccessToast(`Successfully updated ${roleState.targetMember.full_name || roleState.targetMember.email} to ${roleState.newRole}`);
      
      // Close modal and refresh
      closeModals();
      if (onMembersUpdate) onMembersUpdate();
    } catch (error) {
      console.error('Error updating role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role';
      showErrorToast(errorMessage);
    }
  };

  const handleOwnershipTransfer = async () => {
    if (!user || !roleState.targetMember || !familyId) return;

    try {
      await familyService.transferOwnership(
        familyId,
        roleState.targetMember.user_id,
        user.id
      );

      showSuccessToast(`Successfully transferred ownership to ${roleState.targetMember.full_name || roleState.targetMember.email}`);
      
      // Close modal and refresh
      closeModals();
      if (onMembersUpdate) onMembersUpdate();
    } catch (error) {
      console.error('Error transferring ownership:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transfer ownership';
      showErrorToast(errorMessage);
    }
  };

  const handleDeleteMember = async () => {
    if (!user || !roleState.targetMember || !familyId) return;

    try {
      await familyService.removeFamilyMember(
        familyId,
        roleState.targetMember.user_id,
        user.id
      );

      showSuccessToast(`Successfully removed ${roleState.targetMember.full_name || roleState.targetMember.email} from the family`);
      
      // Close modal and refresh
      closeModals();
      if (onMembersUpdate) onMembersUpdate();
    } catch (error) {
      console.error('Error removing member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove member';
      showErrorToast(errorMessage);
    }
  };

  const handleLeaveFamily = async () => {
    if (!user || !familyId) return;

    try {
      await familyService.leaveFamily(familyId, user.id);

      showSuccessToast('Successfully left the family');
      
      // Close modal and redirect or refresh
      closeModals();
      if (onMembersUpdate) onMembersUpdate();
      
      // Optionally redirect to dashboard or family selection
      // window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error leaving family:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to leave family';
      showErrorToast(errorMessage);
    }
  };

  const handleUpdateFeatures = async () => {
    if (!user || !roleState.targetMember || !familyId) return;

    try {
      // Get current features from the form (we'll add form state for this)
      const features = {
        can_create_goals: roleState.targetMember.can_create_goals || false,
        can_view_budgets: roleState.targetMember.can_view_budgets || true,
        can_contribute_goals: roleState.targetMember.can_contribute_goals || true
      };

      await familyService.updateMemberFeatures(
        familyId,
        roleState.targetMember.user_id,
        features,
        user.id
      );

      showSuccessToast(`Successfully updated features for ${roleState.targetMember.full_name || roleState.targetMember.email}`);
      
      // Close modal and refresh
      closeModals();
      if (onMembersUpdate) onMembersUpdate();
    } catch (error) {
      console.error('Error updating features:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update features';
      showErrorToast(errorMessage);
    }
  };

  const openRoleModal = (member: FamilyMember) => {
    setRoleState(prev => ({
      ...prev,
      showRoleModal: true,
      targetMember: member,
      newRole: member.role
    }));
  };

  const openTransferModal = (member: FamilyMember) => {
    setRoleState(prev => ({
      ...prev,
      showTransferModal: true,
      targetMember: member
    }));
  };

  const openDeleteModal = (member: FamilyMember) => {
    setRoleState(prev => ({
      ...prev,
      showDeleteModal: true,
      targetMember: member
    }));
  };

  const openLeaveModal = () => {
    setRoleState(prev => ({
      ...prev,
      showLeaveModal: true
    }));
  };

  const openAssignFeaturesModal = (member: FamilyMember) => {
    setRoleState(prev => ({
      ...prev,
      showAssignFeaturesModal: true,
      targetMember: member
    }));
  };

  const closeModals = () => {
    setRoleState(prev => ({
      ...prev,
      showRoleModal: false,
      showTransferModal: false,
      showDeleteModal: false,
      showLeaveModal: false,
      showAssignFeaturesModal: false,
      targetMember: undefined,
      newRole: undefined,
      deleteConfirmed: false
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

  const canManageMember = (member: FamilyMember): boolean => {
    if (!roleState.canManageRoles || !user) return false;
    
    // Can't manage yourself
    if (member.user_id === user.id) return false;
    
    // Only owner can manage other owners
    const isTargetOwner = familyData && member.user_id === familyData.created_by;
    if (isTargetOwner && !roleState.isOwner) return false;
    
    return true;
  };
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
                <th>Name</th>
                <th>Role</th>
                <th>Join Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const isTargetOwner = familyData && member.user_id === familyData.created_by;
                const canManage = canManageMember(member);
                
                return (
                  <tr key={member.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <img 
                          className="img-profile rounded-circle mr-3" 
                          src={member.avatar_url || member.user?.avatar_url || `../images/placeholder.png`} 
                          alt={member.full_name || member.user?.full_name || member.email || "User"} 
                          width="40" 
                          height="40" 
                        />
                        <div>
                          <div className="font-weight-bold">
                            {member.full_name || member.user?.full_name || member.email || member.user?.email || "Unknown User"}
                            {isCurrentUser && <span className="text-muted ml-1">(You)</span>}
                            {isTargetOwner && <i className="fas fa-crown text-warning ml-2" title="Family Owner"></i>}
                          </div>
                          <div className="small text-gray-600">{member.email || member.user?.email || "No email"}</div>
                        </div>
                      </div>
                    </td>
                    <td>{getMemberRoleBadge(member.role, familyData ? member.user_id === familyData.created_by : false)}</td>
                    <td>{member.created_at ? formatDate(member.created_at) : "N/A"}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        {/* Role Management Button */}
                        {canManage && (
                          <button
                            onClick={() => openRoleModal(member)}
                            className="btn btn-outline-primary"
                            title="Manage Role"
                          >
                            <i className="fas fa-user-cog"></i>
                          </button>
                        )}
                        
                        {/* Transfer Ownership Button - Only for owner */}
                        {roleState.isOwner && !isCurrentUser && (member.role === 'admin' || member.role === 'member') && (
                          <button
                            onClick={() => openTransferModal(member)}
                            className="btn btn-outline-warning"
                            title="Transfer Ownership"
                          >
                            <i className="fas fa-crown"></i>
                          </button>
                        )}
                        
                        {/* Assign Features Button - Only for owners managing others */}
                        {roleState.isOwner && !isCurrentUser && (
                          <button 
                            onClick={() => openAssignFeaturesModal(member)} 
                            className="btn btn-outline-info" 
                            title="Assign Features"
                          >
                            <i className="fas fa-cogs"></i>
                          </button>
                        )}
                        
                        {/* Remove Member Button - Only for owners/admins managing others */}
                        {canManage && (
                          <button 
                            onClick={() => openDeleteModal(member)} 
                            className="btn btn-outline-danger" 
                            title="Remove Member"
                          >
                            <i className="fas fa-user-times"></i>
                          </button>
                        )}
                        
                        {/* Leave Family Button - For current user (non-owners) */}
                        {isCurrentUser && !roleState.isOwner && (
                          <button 
                            onClick={openLeaveModal} 
                            className="btn btn-outline-secondary" 
                            title="Leave Family"
                          >
                            <i className="fas fa-sign-out-alt"></i>
                          </button>
                        )}
                        
                        {/* Show message for restricted users */}
                        {!roleState.canManageRoles && !isCurrentUser && (
                          <span className="badge badge-secondary" title="You don't have permission to manage roles">
                            <i className="fas fa-lock"></i>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* Role Change Modal */}
      {roleState.showRoleModal && roleState.targetMember && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Manage Role</h5>
                <button type="button" className="close" onClick={closeModals}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>Change role for <strong>{roleState.targetMember.full_name || roleState.targetMember.email}</strong>:</p>
                
                <div className="form-group">
                  <label>New Role:</label>
                  <select 
                    className="form-control"
                    value={roleState.newRole || ''}
                    onChange={(e) => setRoleState(prev => ({ ...prev, newRole: e.target.value }))}
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
                  {!roleState.isOwner && (
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
                  disabled={!roleState.newRole || roleState.newRole === roleState.targetMember.role}
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ownership Transfer Modal */}
      {roleState.showTransferModal && roleState.targetMember && (
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
                        src={roleState.targetMember.avatar_url || "/images/placeholder.png"} 
                        className="rounded-circle mr-3" 
                        width="50" 
                        height="50"
                        alt={roleState.targetMember.full_name || 'Member'}
                      />
                      <div>
                        <div className="font-weight-bold h5 mb-1">
                          {roleState.targetMember.full_name || 'Unknown User'}
                        </div>
                        <div className="text-muted">{roleState.targetMember.email}</div>
                        <span className={`badge ${getRoleBadgeClass(roleState.targetMember.role)} mt-1`}>
                          Current: {roleState.targetMember.role.charAt(0).toUpperCase() + roleState.targetMember.role.slice(1)}
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

      {/* Delete Member Modal */}
      {roleState.showDeleteModal && roleState.targetMember && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Remove Family Member
                </h5>
                <button type="button" className="close" onClick={closeModals}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  <strong>Warning:</strong> This action cannot be undone!
                </div>
                
                <p>You are about to remove the following member from your family:</p>
                
                <div className="card bg-light mb-3">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <img 
                        src={roleState.targetMember.avatar_url || "/images/placeholder.png"} 
                        className="rounded-circle mr-3" 
                        width="50" 
                        height="50"
                        alt={roleState.targetMember.full_name || 'Member'}
                      />
                      <div>
                        <div className="font-weight-bold h5 mb-1">
                          {roleState.targetMember.full_name || 'Unknown User'}
                        </div>
                        <div className="text-muted">{roleState.targetMember.email}</div>
                        <span className={`badge ${getRoleBadgeClass(roleState.targetMember.role)} mt-1`}>
                          Role: {roleState.targetMember.role.charAt(0).toUpperCase() + roleState.targetMember.role.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="alert alert-info">
                  <h6>What happens when you remove this member:</h6>
                  <ul className="mb-0">
                    <li>They will lose access to all family data and features</li>
                    <li>Their transactions and goals will remain in the system</li>
                    <li>They can be re-invited later if needed</li>
                    <li>Any shared budgets or goals they contributed to will be affected</li>
                  </ul>
                </div>

                <div className="form-group">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="confirmRemoval" 
                      checked={roleState.deleteConfirmed}
                      onChange={(e) => setRoleState(prev => ({ ...prev, deleteConfirmed: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="confirmRemoval">
                      I understand that removing this member will revoke their access to all family features
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleDeleteMember}
                  disabled={!roleState.deleteConfirmed}
                >
                  <i className="fas fa-trash mr-2"></i>
                  Remove Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Family Modal */}
      {roleState.showLeaveModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-warning">
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Leave Family
                </h5>
                <button type="button" className="close" onClick={closeModals}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  <strong>Warning:</strong> You are about to leave this family!
                </div>
                
                <p>Are you sure you want to leave <strong>{familyData?.family_name}</strong>?</p>
                
                <div className="alert alert-info">
                  <h6>What happens when you leave:</h6>
                  <ul className="mb-0">
                    <li>You will lose access to all family data and features</li>
                    <li>Your transactions and goals will remain in the system</li>
                    <li>You can be re-invited by family admins later</li>
                    <li>Any shared budgets or goals you contributed to will be affected</li>
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
                  onClick={handleLeaveFamily}
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Leave Family
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Features Modal */}
      {roleState.showAssignFeaturesModal && roleState.targetMember && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-info">
                  <i className="fas fa-cogs mr-2"></i>
                  Assign Features
                </h5>
                <button type="button" className="close" onClick={closeModals}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>Manage features for <strong>{roleState.targetMember.full_name || roleState.targetMember.email}</strong>:</p>
                
                <div className="card bg-light mb-3">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-2">
                      <img 
                        src={roleState.targetMember.avatar_url || "/images/placeholder.png"} 
                        className="rounded-circle mr-3" 
                        width="40" 
                        height="40"
                        alt={roleState.targetMember.full_name || 'Member'}
                      />
                      <div>
                        <div className="font-weight-bold">
                          {roleState.targetMember.full_name || 'Unknown User'}
                        </div>
                        <div className="text-muted small">{roleState.targetMember.email}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <h6 className="mb-3">Feature Permissions:</h6>
                  
                  <div className="form-check mb-2">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="canCreateGoals"
                      defaultChecked={roleState.targetMember.can_create_goals}
                    />
                    <label className="form-check-label" htmlFor="canCreateGoals">
                      <strong>Can Create Goals</strong>
                      <small className="d-block text-muted">Allow this member to create new family goals</small>
                    </label>
                  </div>
                  
                  <div className="form-check mb-2">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="canViewBudgets"
                      defaultChecked={roleState.targetMember.can_view_budgets}
                    />
                    <label className="form-check-label" htmlFor="canViewBudgets">
                      <strong>Can View Budgets</strong>
                      <small className="d-block text-muted">Allow this member to view family budgets and financial data</small>
                    </label>
                  </div>
                  
                  <div className="form-check mb-2">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="canContributeGoals"
                      defaultChecked={roleState.targetMember.can_contribute_goals}
                    />
                    <label className="form-check-label" htmlFor="canContributeGoals">
                      <strong>Can Contribute to Goals</strong>
                      <small className="d-block text-muted">Allow this member to contribute money to family goals</small>
                    </label>
                  </div>
                </div>
                
                <div className="alert alert-info small">
                  <strong>Note:</strong> These permissions are in addition to the member's role-based permissions. 
                  Role permissions (admin, member, viewer) define the base level of access.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-info"
                  onClick={handleUpdateFeatures}
                >
                  <i className="fas fa-save mr-2"></i>
                  Update Features
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersTab;
