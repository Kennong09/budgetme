import React from 'react';
import { DeleteConfirmationModalProps } from '../types';

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
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
              className="btn" 
              onClick={onCancel}
              disabled={isDeleting}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: 'transparent',
                color: '#4e73df',
                border: '1px solid #4e73df',
                borderRadius: '30px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                marginRight: '1rem'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(78, 115, 223, 0.1)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-danger" 
              onClick={onConfirm}
              disabled={isDeleting}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#e74a3b',
                borderColor: '#e74a3b',
                borderRadius: '30px',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#d52a1a';
                e.currentTarget.style.borderColor = '#d52a1a';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#e74a3b';
                e.currentTarget.style.borderColor = '#e74a3b';
              }}
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
};

export default DeleteConfirmationModal;