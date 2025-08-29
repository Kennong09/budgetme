import React from 'react';
import { DeleteModalState } from '../../types';

interface DeleteGoalModalProps {
  deleteModalState: DeleteModalState;
  onCloseModal: () => void;
  onDeleteGoal: () => void;
  onViewLinkedTransactions: () => void;
}

const DeleteGoalModal: React.FC<DeleteGoalModalProps> = ({
  deleteModalState,
  onCloseModal,
  onDeleteGoal,
  onViewLinkedTransactions
}) => {
  const { showDeleteModal, isDeleting, deleteError, hasLinkedTransactions } = deleteModalState;

  if (!showDeleteModal) return null;

  return (
    <div className="modal" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Confirm Deletion</h5>
            <button type="button" className="close" onClick={onCloseModal} disabled={isDeleting}>
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
            
            {deleteError ? (
              <>
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-circle mr-1"></i>
                  {deleteError}
                </div>
                
                {hasLinkedTransactions && (
                  <div className="mt-3">
                    <p>To resolve this issue, you need to:</p>
                    <ol className="text-left">
                      <li>View the transactions linked to this goal</li>
                      <li>Either delete them or reassign them to another goal</li>
                      <li>Then try deleting this goal again</li>
                    </ol>
                    <button 
                      type="button" 
                      className="btn btn-info mt-2"
                      onClick={onViewLinkedTransactions}
                    >
                      <i className="fas fa-search mr-1"></i> View Linked Transactions
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p>Are you sure you want to delete this goal? This action cannot be undone.</p>
                <div className="alert alert-warning small mt-3">
                  <i className="fas fa-info-circle mr-1"></i>
                  <strong>Note:</strong> If this goal has linked transactions, you'll need to reassign or delete those transactions first.
                </div>
              </>
            )}
          </div>
          <div className="modal-footer d-flex justify-content-center">
            <button 
              type="button" 
              className="btn btn-outline-secondary" 
              onClick={onCloseModal}
              disabled={isDeleting}
            >
              Cancel
            </button>
            {!deleteError && (
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={onDeleteGoal}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                    Delete
                  </>
                ) : "Delete"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteGoalModal;