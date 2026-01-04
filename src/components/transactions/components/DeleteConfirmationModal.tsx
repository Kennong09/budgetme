import React, { FC, memo } from 'react';
import { DeleteConfirmationModalProps } from '../types';

const DeleteConfirmationModal: FC<DeleteConfirmationModalProps> = memo(({
  show,
  isDeleting,
  onConfirm,
  onCancel
}) => {
  if (!show) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1050,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="modal-dialog modal-dialog-centered" style={{
        maxWidth: '450px',
        margin: '1.75rem',
        position: 'relative',
        width: 'auto',
        pointerEvents: 'none',
        zIndex: 1060
      }}>
        <div className="modal-content" style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          borderRadius: '0.5rem',
          pointerEvents: 'auto',
          boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)'
        }}>
          <div className="modal-header border-0 pt-4 px-4 pb-0">
            <h3 className="modal-title w-100 text-center" style={{ color: '#4e73df', fontWeight: 600 }}>
              Confirm Deletion
            </h3>
            <button 
              type="button" 
              className="close" 
              onClick={onCancel} 
              style={{ 
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#999',
                background: 'none',
                border: 'none',
                cursor: 'pointer' 
              }}
              aria-label="Close"
              disabled={isDeleting}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body text-center p-4">
            <div className="mb-4">
              <div className="warning-icon" style={{
                backgroundColor: '#FFEFD5',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}>
                <i className="fas fa-exclamation-triangle fa-3x" style={{ color: '#FFA500' }}></i>
              </div>
            </div>
            <p style={{ fontSize: '1rem', color: '#555' }}>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
          </div>
          <div className="modal-footer border-0 pb-4 pt-0 justify-content-center">
            <button 
              type="button" 
              className="inline-flex items-center justify-center px-4 py-2 md:px-6 md:py-2.5 bg-white hover:bg-blue-50 text-[#4e73df] border border-[#4e73df] text-sm md:text-base font-medium rounded-full shadow-sm transition-colors mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onCancel}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="inline-flex items-center justify-center px-4 py-2 md:px-6 md:py-2.5 bg-[#e74a3b] hover:bg-[#d52a1a] text-white border border-[#e74a3b] text-sm md:text-base font-medium rounded-full shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                  Deleting...
                </>
              ) : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

DeleteConfirmationModal.displayName = 'DeleteConfirmationModal';

export default DeleteConfirmationModal;