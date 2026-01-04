import { useState, useEffect, FC } from "react";
import { Badge } from "react-bootstrap";
import { Family, FamilyMember } from "./types";
import { formatDate } from "../../../utils/helpers";
import { useToast } from "../../../utils/ToastContext";

interface ViewFamilyModalProps {
  show: boolean;
  family: Family | null;
  onClose: () => void;
  onEdit: (family: Family) => void;
  onDelete: (family: Family) => void;
  onGetMembers: (familyId: string) => Promise<FamilyMember[]>;
  onRemoveMember: (memberId: string, familyId: string) => Promise<boolean>;
}

const ViewFamilyModal: FC<ViewFamilyModalProps> = ({
  show,
  family,
  onClose,
  onEdit,
  onDelete,
  onGetMembers,
  onRemoveMember
}) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const { showSuccessToast } = useToast();

  useEffect(() => {
    if (show && family) {
      loadFamilyMembers();
    }
  }, [show, family]);

  const loadFamilyMembers = async () => {
    if (!family) return;
    setLoadingMembers(true);
    try {
      const memberData = await onGetMembers(family.id);
      setMembers(memberData);
    } catch (error) {
      console.error('Error loading family members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRemoveMember = async (member: FamilyMember) => {
    if (!family || member.user_id === family.created_by) return;
    setRemovingMember(member.id);
    try {
      const success = await onRemoveMember(member.id, family.id);
      if (success) {
        setMembers(prev => prev.filter(m => m.id !== member.id));
        showSuccessToast(`Member removed from family`);
      }
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setRemovingMember(null);
    }
  };

  if (!show || !family) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose}></div>
      <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }} onClick={onClose}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable mx-2 mx-md-auto" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '90vh' }}>
            
            {/* Header */}
            <div className="modal-header border-0 text-white py-2 py-md-3" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
              <div className="d-flex align-items-center w-100">
                <div className="d-flex align-items-center justify-content-center mr-2" 
                     style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                  <i className="fas fa-users" style={{ fontSize: '1rem' }}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <h6 className="mb-0 font-weight-bold text-truncate" style={{ fontSize: '0.9rem' }}>{family.family_name}</h6>
                  <small className="d-none d-md-block" style={{ opacity: 0.9, fontSize: '0.75rem' }}>Family Details & Members</small>
                </div>
                <button type="button" className="btn btn-light btn-sm flex-shrink-0" onClick={onClose}
                        style={{ width: '32px', height: '32px', borderRadius: '6px', padding: 0 }}>
                  <i className="fas fa-times text-danger"></i>
                </button>
              </div>
            </div>

            {/* Quick Stats Bar - Mobile: 2x2 grid, Desktop: 4 cols */}
            <div className="px-2 px-md-3 py-2" style={{ background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <div className="row text-center g-1 g-md-2">
                <div className="col-6 col-md-3 mb-1 mb-md-0">
                  <div className="d-flex align-items-center justify-content-center p-1 rounded" style={{ background: 'rgba(255,255,255,0.5)' }}>
                    <i className={`fas fa-${family.status === 'active' ? 'check-circle text-success' : 'pause-circle text-secondary'} mr-1`} style={{ fontSize: '0.8rem' }}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.6rem', lineHeight: 1 }}>Status</small>
                      <strong style={{ fontSize: '0.7rem' }} className={family.status === 'active' ? 'text-success' : 'text-secondary'}>
                        {family.status === 'active' ? 'Active' : 'Inactive'}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3 mb-1 mb-md-0">
                  <div className="d-flex align-items-center justify-content-center p-1 rounded" style={{ background: 'rgba(255,255,255,0.5)' }}>
                    <i className="fas fa-user-friends text-danger mr-1" style={{ fontSize: '0.8rem' }}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.6rem', lineHeight: 1 }}>Members</small>
                      <strong className="text-danger" style={{ fontSize: '0.7rem' }}>{family.members_count || 0}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="d-flex align-items-center justify-content-center p-1 rounded" style={{ background: 'rgba(255,255,255,0.5)' }}>
                    <i className="fas fa-coins text-warning mr-1" style={{ fontSize: '0.8rem' }}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.6rem', lineHeight: 1 }}>Currency</small>
                      <strong className="text-warning" style={{ fontSize: '0.7rem' }}>{family.currency_pref}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="d-flex align-items-center justify-content-center p-1 rounded" style={{ background: 'rgba(255,255,255,0.5)' }}>
                    <i className={`fas fa-${family.is_public ? 'globe text-info' : 'lock text-secondary'} mr-1`} style={{ fontSize: '0.8rem' }}></i>
                    <div className="text-left">
                      <small className="text-muted d-block" style={{ fontSize: '0.6rem', lineHeight: 1 }}>Visibility</small>
                      <strong style={{ fontSize: '0.7rem' }} className={family.is_public ? 'text-info' : 'text-secondary'}>
                        {family.is_public ? 'Public' : 'Private'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body py-2 py-md-3 px-2 px-md-3" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              
              {/* Family Details Section */}
              <div className="mb-3">
                <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                  <i className="fas fa-info-circle mr-2"></i>Family Details
                </h6>
                <div className="row">
                  <div className="col-md-6">
                    <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px', height: '100%' }}>
                      <div className="mb-2">
                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Family Name</small>
                        <strong style={{ fontSize: '0.9rem' }}>{family.family_name}</strong>
                      </div>
                      <div className="mb-2">
                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Description</small>
                        <span style={{ fontSize: '0.85rem' }}>{family.description || 'No description provided'}</span>
                      </div>
                      <div>
                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Created</small>
                        <span style={{ fontSize: '0.85rem' }}>{formatDate(family.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mt-2 mt-md-0">
                    <div className="p-3 text-center" style={{ background: '#f8f9fa', borderRadius: '8px', height: '100%' }}>
                      <h6 className="text-danger mb-2" style={{ fontSize: '0.85rem' }}>
                        <i className="fas fa-crown mr-1"></i>Owner
                      </h6>
                      {family.owner ? (
                        <>
                          <img
                            src={family.owner.avatar_url || "../images/placeholder.png"}
                            alt={family.owner.full_name}
                            className="rounded-circle mb-2"
                            style={{ width: '50px', height: '50px', objectFit: 'cover', border: '2px solid #dc3545' }}
                            onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                          />
                          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{family.owner.full_name}</div>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>{family.owner.email}</small>
                          <div className="mt-2">
                            <Badge bg="primary" style={{ fontSize: '0.65rem' }}>
                              <i className="fas fa-shield-alt mr-1"></i>Admin
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Owner info not available</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Members Section */}
              <div className="mb-0">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="text-danger mb-0" style={{ fontSize: '0.85rem' }}>
                    <i className="fas fa-users mr-2"></i>Family Members ({members.length})
                  </h6>
                  <button 
                    className="btn btn-outline-danger btn-sm"
                    onClick={loadFamilyMembers}
                    disabled={loadingMembers}
                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                  >
                    <i className={`fas fa-sync-alt ${loadingMembers ? 'fa-spin' : ''} mr-1`}></i>
                    Refresh
                  </button>
                </div>
                <div className="p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                  {loadingMembers ? (
                    <div className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-danger" role="status"></div>
                      <p className="mb-0 text-muted mt-2" style={{ fontSize: '0.8rem' }}>Loading members...</p>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <i className="fas fa-users fa-2x mb-2"></i>
                      <p className="mb-0" style={{ fontSize: '0.85rem' }}>No members found</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {members.map((member) => (
                        <div 
                          key={member.id} 
                          className="d-flex align-items-center py-2 px-2 mb-1" 
                          style={{ background: '#fff', borderRadius: '6px', border: '1px solid #e9ecef' }}
                        >
                          <img
                            src={member.user?.avatar_url || "../images/placeholder.png"}
                            alt=""
                            className="rounded-circle mr-2"
                            style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.src = "../images/placeholder.png"; }}
                          />
                          <div className="flex-grow-1">
                            <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{member.user?.full_name || "Unknown"}</div>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>{member.user?.email || "No email"}</small>
                          </div>
                          <div className="d-flex align-items-center" style={{ gap: '6px' }}>
                            <Badge bg={member.role === 'admin' ? 'primary' : 'secondary'} style={{ fontSize: '0.6rem' }}>
                              {member.role}
                            </Badge>
                            {member.user_id === family.created_by && (
                              <Badge bg="warning" style={{ fontSize: '0.6rem' }}>Owner</Badge>
                            )}
                            {member.user_id !== family.created_by ? (
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleRemoveMember(member)}
                                disabled={removingMember === member.id}
                                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                              >
                                {removingMember === member.id ? (
                                  <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                  <i className="fas fa-user-minus"></i>
                                )}
                              </button>
                            ) : (
                              <i className="fas fa-lock text-muted" style={{ fontSize: '0.75rem' }}></i>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer - Mobile Responsive */}
            <div 
              className="modal-footer border-0" 
              style={{ 
                background: '#f8f9fa',
                padding: '10px 16px',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <small className="text-muted d-none d-sm-block" style={{ fontSize: '11px', flex: '1 1 100%', marginBottom: '4px' }}>
                <i className="fas fa-users mr-1"></i>
                {members.length} member{members.length !== 1 ? 's' : ''} • Created {formatDate(family.created_at)}
              </small>
              <div className="d-flex w-100 gap-2" style={{ gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={onClose}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  <i className="fas fa-times mr-1"></i>Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning" 
                  onClick={() => onEdit(family)}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  <i className="fas fa-edit mr-1"></i>Edit
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={() => onDelete(family)}
                  style={{ 
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    minHeight: '42px'
                  }}
                >
                  <i className="fas fa-trash mr-1"></i>Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewFamilyModal;
