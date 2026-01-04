import React, { FC, memo } from "react";

interface DeleteModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteModal: FC<DeleteModalProps> = memo(({
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
        <div className="modal-dialog modal-dialog-centered mx-3 md:mx-auto" role="document">
          <div className="modal-content animate__animated animate__zoomIn">
            <div className="modal-header border-0">
              <h5 className="modal-title text-base md:text-lg font-bold text-danger" id="deleteModalTitle">
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
            <div className="modal-body p-3 md:p-4">
              <div className="text-center">
                <div className="mb-3 md:mb-4">
                  <i className="fas fa-trash-alt fa-2x md:fa-3x text-danger mb-2 md:mb-3"></i>
                  <p className="text-sm md:text-base text-gray-700 mb-0">{message}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer border-0 p-3 md:p-4 gap-2">
              <button
                type="button"
                className="px-3 py-2 md:px-4 md:py-2.5 bg-gray-600 hover:bg-gray-700 text-white text-sm md:text-base font-medium rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onCancel}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-2 md:px-4 md:py-2.5 bg-[#e74a3b] hover:bg-[#d12f1f] text-white text-sm md:text-base font-medium rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-1 md:mr-2 text-xs md:text-sm"></i>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash mr-1 md:mr-2 text-xs md:text-sm"></i>
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
});

DeleteModal.displayName = 'DeleteModal';

export default DeleteModal;
