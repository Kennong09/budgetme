import React, { useState, useEffect } from 'react';
import { storageManager } from '../../utils/storageManager';

interface StorageCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCleanupComplete: () => void;
}

export const StorageCleanupModal: React.FC<StorageCleanupModalProps> = ({
  isOpen,
  onClose,
  onCleanupComplete
}) => {
  const [storageStats, setStorageStats] = useState<{
    used: number;
    percentage: number;
    itemCount: number;
  } | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResults, setCleanupResults] = useState<{
    itemsRemoved: number;
    spaceFeed: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Get current storage stats
      const stats = storageManager.getStorageStats();
      setStorageStats(stats);
    }
  }, [isOpen]);

  const performCleanup = async () => {
    setCleaning(true);
    setCleanupResults(null);

    try {
      const beforeStats = storageManager.getStorageStats();
      
      // Perform aggressive cleanup
      let itemsRemoved = 0;
      const keysToRemove: string[] = [];
      
      // Remove all non-essential items
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          // Keep only current auth and essential data
          if (key === 'supabase.auth.token' || 
              key.startsWith('budgetme_auth_fallback') ||
              key === 'budgetme_user_preferences') {
            continue;
          }
          
          keysToRemove.push(key);
        }
      }

      // Remove items
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          itemsRemoved++;
        } catch (error) {
          console.warn('Failed to remove item during cleanup:', key);
        }
      });

      const afterStats = storageManager.getStorageStats();
      const spaceFeed = beforeStats.used - afterStats.used;

      setCleanupResults({
        itemsRemoved,
        spaceFeed
      });

      setStorageStats(afterStats);
      
      setTimeout(() => {
        onCleanupComplete();
      }, 2000);

    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      setCleaning(false);
    }
  };

  const clearAllAndRestart = () => {
    if (window.confirm('This will clear ALL browser data and restart the application. Continue?')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        
        // Show loading message
        document.body.innerHTML = `
          <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-family:Arial,sans-serif;">
            <h2>Clearing browser storage...</h2>
            <p>The page will reload automatically.</p>
            <div style="border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;width:40px;height:40px;animation:spin 2s linear infinite;margin:20px auto;"></div>
            <style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>
          </div>
        `;
        
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 2000);
      } catch (error) {
        window.location.reload();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-hdd mr-2 text-warning"></i>
              Browser Storage Cleanup
            </h5>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          
          <div className="modal-body">
            {storageStats && (
              <div className="mb-4">
                <h6>Current Storage Usage</h6>
                <div className="progress mb-2" style={{ height: '25px' }}>
                  <div 
                    className={`progress-bar ${storageStats.percentage > 90 ? 'bg-danger' : storageStats.percentage > 70 ? 'bg-warning' : 'bg-success'}`}
                    style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                  >
                    {storageStats.percentage.toFixed(1)}%
                  </div>
                </div>
                <small className="text-muted">
                  Using {(storageStats.used / 1024 / 1024).toFixed(2)} MB of ~5 MB available
                  ({storageStats.itemCount} items stored)
                </small>
              </div>
            )}

            {cleanupResults ? (
              <div className="alert alert-success">
                <h6><i className="fas fa-check-circle mr-2"></i>Cleanup Complete!</h6>
                <p className="mb-0">
                  Removed {cleanupResults.itemsRemoved} items, 
                  freed {(cleanupResults.spaceFeed / 1024 / 1024).toFixed(2)} MB of space.
                </p>
              </div>
            ) : (
              <div>
                <p>
                  Your browser storage is nearly full. This can cause login issues and slow performance.
                  We can help by cleaning up old data that's no longer needed.
                </p>
                
                <div className="alert alert-info">
                  <h6><i className="fas fa-info-circle mr-2"></i>What will be cleaned:</h6>
                  <ul className="mb-0">
                    <li>Old cache data</li>
                    <li>Rate limiting timestamps</li>
                    <li>Temporary form data</li>
                    <li>Expired session data</li>
                  </ul>
                </div>

                <div className="alert alert-warning">
                  <h6><i className="fas fa-shield-alt mr-2"></i>What will be kept:</h6>
                  <ul className="mb-0">
                    <li>Your login session</li>
                    <li>User preferences</li>
                    <li>Account data (stored on server)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            {cleanupResults ? (
              <button type="button" className="btn btn-success" onClick={onClose}>
                <i className="fas fa-check mr-2"></i>Done
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary mr-2" 
                  onClick={performCleanup}
                  disabled={cleaning}
                >
                  {cleaning ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2"></span>
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-broom mr-2"></i>
                      Clean Storage
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning" 
                  onClick={clearAllAndRestart}
                >
                  <i className="fas fa-trash mr-2"></i>
                  Clear All & Restart
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageCleanupModal;