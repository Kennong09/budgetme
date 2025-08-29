import React, { FC } from "react";

interface DeleteModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteModal: FC<DeleteModalProps> = ({
  isOpen,
  isDeleting,
  title,
  message,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Modal backdrop */}
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
      
      {/* Modal */}
      <div 
        className="modal fade show" 
        style={{ display: "block", zIndex: 1050 }}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="deleteModalTitle"
        aria-hidden="false"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content animate__animated animate__zoomIn">
            <div className="modal-header border-0">
              <h5 className="modal-title font-weight-bold text-danger" id="deleteModalTitle">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                {title}
              </h5>
              <button
                type="button"
                className="close"
                onClick={onCancel}
                aria-label="Close"
                disabled={isDeleting}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="text-center">
                <div className="mb-4">
                  <i className="fas fa-trash-alt fa-3x text-danger mb-3"></i>
                  <p className="text-gray-700 mb-0">{message}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer border-0">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
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
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash mr-2"></i>
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteModal;
