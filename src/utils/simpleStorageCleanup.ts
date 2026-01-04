/**
 * Simple storage cleanup utility to handle localStorage quota issues
 * This is a minimal, aggressive cleanup focused specifically on auth storage problems
 */

export class SimpleStorageCleanup {
  /**
   * Perform aggressive localStorage cleanup to free space for auth tokens
   */
  static performEmergencyCleanup(): void {
    console.warn('Performing emergency localStorage cleanup for auth...');
    
    const itemsToRemove: string[] = [];
    const authKeysToPreserve = new Set([
      'sb-noagsxfixjrgatexuwxm-auth-token', // Current Supabase auth token
    ]);
    
    try {
      // Collect all keys except current auth token
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !authKeysToPreserve.has(key)) {
          // Remove everything except current auth session
          itemsToRemove.push(key);
        }
      }
      
      // Remove collected items
      itemsToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to remove localStorage item: ${key}`, error);
        }
      });
      
      console.log(`Emergency cleanup completed. Removed ${itemsToRemove.length} items from localStorage.`);
      
      // Force garbage collection if available
      if (window.gc && typeof window.gc === 'function') {
        try {
          window.gc();
        } catch (e) {
          // Ignore gc errors
        }
      }
      
    } catch (error) {
      console.error('Error during emergency localStorage cleanup:', error);
      
      // If normal cleanup fails, try nuclear option (clear everything)
      try {
        console.warn('Normal cleanup failed, clearing all localStorage...');
        localStorage.clear();
        console.log('localStorage cleared completely.');
      } catch (clearError) {
        console.error('Failed to clear localStorage:', clearError);
      }
    }
  }
  
  /**
   * Check if localStorage has enough space for auth operations
   */
  static checkStorageSpace(): boolean {
    try {
      // Try to set a small test item
      const testKey = '__storage_test__';
      const testValue = 'test';
      localStorage.setItem(testKey, testValue);
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Clean up old Supabase auth tokens and sessions
   */
  static cleanupOldAuthData(): void {
    try {
      const keysToCheck = [];
      
      // Collect all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          keysToCheck.push(key);
        }
      }
      
      // Remove old/expired auth-related items
      keysToCheck.forEach(key => {
        try {
          if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
            const value = localStorage.getItem(key);
            if (value) {
              try {
                const parsed = JSON.parse(value);
                // Remove expired tokens
                if (parsed.expires_at && Date.now() / 1000 > parsed.expires_at) {
                  localStorage.removeItem(key);
                  console.log(`Removed expired auth item: ${key}`);
                }
              } catch (parseError) {
                // If it's not valid JSON and looks old, remove it
                if (key !== 'sb-noagsxfixjrgatexuwxm-auth-token') {
                  localStorage.removeItem(key);
                  console.log(`Removed invalid auth item: ${key}`);
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Error checking auth item ${key}:`, error);
        }
      });
      
    } catch (error) {
      console.error('Error during auth cleanup:', error);
    }
  }
}

export default SimpleStorageCleanup;