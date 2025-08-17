import React from 'react';

interface DeleteFamilyModalProps {
  show: boolean;
  isCreator: boolean;
  familyName: string | undefined;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteFamilyModal: React.FC<DeleteFamilyModalProps> = ({
  show,
  isCreator,
  familyName,
  isDeleting,
  onClose,
  onConfirm
}) => {
  if (!show) return null;

  return (
    <div className="modal" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{isCreator ? "Confirm Deletion" : "Confirm Leave Family"}</h5>
            <button type="button" className="close" onClick={onClose} disabled={isDeleting}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body text-center">
            <div className="mb-4">
              <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center" 
                style={{ width: "80px", height: "80px", backgroundColor: "rgba(246, 194, 62, 0.2)" }}>
                <i className="fas fa-exclamation-triangle fa-3x text-warning"></i>
              </div>
            </div>
            {isCreator ? (
              <>
                <p>Are you sure you want to delete your family group "{familyName}"?</p>
                <p className="text-muted small">This will remove all family member associations. Individual user data like transactions and goals will remain intact, but will no longer be associated with this family.</p>
              </>
            ) : (
              <>
                <p>Are you sure you want to leave the family group "{familyName}"?</p>
                <p className="text-muted small">You will no longer have access to family financial data or shared goals. Your personal data will remain intact.</p>
              </>
            )}
          </div>
          <div className="modal-footer d-flex justify-content-center">
            <button 
              type="button" 
              className="btn btn-outline-secondary" 
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-danger" 
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                  Leaving...
                </>
              ) : "Leave"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteFamilyModal;
