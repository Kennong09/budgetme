/**
 * Storage Manager - Handles localStorage quota issues and provides robust storage operations
 */

interface StorageData {
  value: any;
  timestamp: number;
  expires?: number;
}

class StorageManager {
  private static instance: StorageManager;
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB soft limit
  private readonly CLEANUP_THRESHOLD = 0.8; // Clean up when 80% full
  private readonly PREFIX = 'budgetme_';

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * Calculate approximate localStorage usage
   */
  private getStorageSize(): number {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  /**
   * Check if we're approaching storage limits
   */
  private isStorageNearLimit(): boolean {
    const currentSize = this.getStorageSize();
    return currentSize > (this.MAX_STORAGE_SIZE * this.CLEANUP_THRESHOLD);
  }

  /**
   * Clean up expired and old items
   */
  private cleanupStorage(): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      const oldItems: Array<{ key: string; timestamp: number }> = [];

      // Collect expired and old items
      for (const key in localStorage) {
        if (!localStorage.hasOwnProperty(key)) continue;

        try {
          // Check if it's our app data
          if (key.startsWith(this.PREFIX)) {
            const rawValue = localStorage.getItem(key);
            if (rawValue) {
              try {
                const data = JSON.parse(rawValue) as StorageData;
                
                // Remove expired items
                if (data.expires && now > data.expires) {
                  keysToRemove.push(key);
                  continue;
                }

                // Track old items for potential cleanup
                if (data.timestamp && now - data.timestamp > 7 * 24 * 60 * 60 * 1000) { // 7 days old
                  oldItems.push({ key, timestamp: data.timestamp });
                }
              } catch {
                // If it's not structured data, check if it's old signup/rate limiting data
                if (key.includes('_last_signup_') || key.includes('_last_resend_')) {
                  const timestamp = parseInt(rawValue);
                  if (!isNaN(timestamp) && now - timestamp > 24 * 60 * 60 * 1000) { // 24 hours old
                    keysToRemove.push(key);
                  }
                }
              }
            }
          }
          // Clean up very old non-app items that might be taking space
          else if (key.includes('supabase') || key.includes('auth') || key.includes('session')) {
            // Only remove if they look like old auth data
            const rawValue = localStorage.getItem(key);
            if (rawValue && rawValue.length > 1000) { // Large auth items
              try {
                const data = JSON.parse(rawValue);
                if (data.expires_at && now > data.expires_at * 1000) {
                  keysToRemove.push(key);
                }
              } catch {
                // Invalid JSON - might be corrupted
                keysToRemove.push(key);
              }
            }
          }
        } catch (error) {
          console.warn('Error checking storage item:', key, error);
        }
      }

      // Remove expired items
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log('Cleaned up expired storage item:', key);
        } catch (error) {
          console.warn('Failed to remove expired item:', key, error);
        }
      });

      // If still near limit, remove oldest items
      if (this.isStorageNearLimit() && oldItems.length > 0) {
        oldItems.sort((a, b) => a.timestamp - b.timestamp);
        const itemsToRemove = oldItems.slice(0, Math.max(1, Math.floor(oldItems.length / 2)));
        
        itemsToRemove.forEach(({ key }) => {
          try {
            localStorage.removeItem(key);
            console.log('Cleaned up old storage item:', key);
          } catch (error) {
            console.warn('Failed to remove old item:', key, error);
          }
        });
      }

      console.log(`Storage cleanup completed. Removed ${keysToRemove.length} expired items.`);
    } catch (error) {
      console.error('Error during storage cleanup:', error);
    }
  }

  /**
   * Safely set item in localStorage with quota handling
   */
  setItem(key: string, value: any, expiresIn?: number): boolean {
    try {
      const storageKey = key.startsWith(this.PREFIX) ? key : this.PREFIX + key;
      const expires = expiresIn ? Date.now() + expiresIn : undefined;
      const data: StorageData = {
        value,
        timestamp: Date.now(),
        expires
      };

      const serializedData = JSON.stringify(data);
      
      try {
        localStorage.setItem(storageKey, serializedData);
        return true;
      } catch (error: any) {
        if (error.name === 'QuotaExceededError' || error.code === 22) {
          console.warn('localStorage quota exceeded, attempting cleanup...');
          
          // Clean up and try again
          this.cleanupStorage();
          
          try {
            localStorage.setItem(storageKey, serializedData);
            console.log('Successfully stored item after cleanup:', storageKey);
            return true;
          } catch (retryError: any) {
            if (retryError.name === 'QuotaExceededError') {
              // If still failing, try to free more space
              this.emergencyCleanup();
              
              try {
                localStorage.setItem(storageKey, serializedData);
                console.log('Successfully stored item after emergency cleanup:', storageKey);
                return true;
              } catch (finalError) {
                console.error('Failed to store item even after emergency cleanup:', storageKey, finalError);
                throw new Error('Storage quota exceeded and cleanup failed. Please clear your browser data.');
              }
            }
            throw retryError;
          }
        }
        throw error;
      }
    } catch (error) {
      console.error('Error setting localStorage item:', key, error);
      return false;
    }
  }

  /**
   * Safely get item from localStorage
   */
  getItem(key: string): any {
    try {
      const storageKey = key.startsWith(this.PREFIX) ? key : this.PREFIX + key;
      const rawValue = localStorage.getItem(storageKey);
      
      if (!rawValue) {
        return null;
      }

      try {
        const data = JSON.parse(rawValue) as StorageData;
        
        // Check if expired
        if (data.expires && Date.now() > data.expires) {
          localStorage.removeItem(storageKey);
          return null;
        }

        return data.value;
      } catch {
        // Fallback for non-structured data
        return rawValue;
      }
    } catch (error) {
      console.error('Error getting localStorage item:', key, error);
      return null;
    }
  }

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): boolean {
    try {
      const storageKey = key.startsWith(this.PREFIX) ? key : this.PREFIX + key;
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error('Error removing localStorage item:', key, error);
      return false;
    }
  }

  /**
   * Emergency cleanup - removes more items to free space
   */
  private emergencyCleanup(): void {
    console.warn('Performing emergency storage cleanup...');
    
    try {
      const keysToRemove: string[] = [];
      
      // Remove all rate limiting data
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          if (key.includes('_last_signup_') || 
              key.includes('_last_resend_') ||
              key.includes('budgetme_email_sent_at') ||
              key.includes('budgetme_timeout_recovery') ||
              (key.startsWith('budgetme_') && key.includes('cache'))) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn('Failed to remove item during emergency cleanup:', key);
        }
      });

      console.log(`Emergency cleanup completed. Removed ${keysToRemove.length} items.`);
    } catch (error) {
      console.error('Error during emergency cleanup:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(): { used: number; percentage: number; itemCount: number } {
    const used = this.getStorageSize();
    const percentage = (used / this.MAX_STORAGE_SIZE) * 100;
    const itemCount = Object.keys(localStorage).length;
    
    return { used, percentage, itemCount };
  }

  /**
   * Initialize storage manager - should be called on app start
   */
  initialize(): void {
    try {
      // Check if we need initial cleanup
      if (this.isStorageNearLimit()) {
        console.log('Storage near limit on initialization, performing cleanup...');
        this.cleanupStorage();
      }

      // Set up periodic cleanup (every 30 minutes)
      setInterval(() => {
        if (this.isStorageNearLimit()) {
          this.cleanupStorage();
        }
      }, 30 * 60 * 1000);

      console.log('StorageManager initialized');
    } catch (error) {
      console.error('Error initializing StorageManager:', error);
    }
  }
}

// Create singleton instance
export const storageManager = StorageManager.getInstance();

// Legacy localStorage wrapper functions for backward compatibility
export const safeSetItem = (key: string, value: string): boolean => {
  return storageManager.setItem(key, value);
};

export const safeGetItem = (key: string): string | null => {
  return storageManager.getItem(key);
};

export const safeRemoveItem = (key: string): boolean => {
  return storageManager.removeItem(key);
};

export default storageManager;