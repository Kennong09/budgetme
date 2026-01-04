/**
 * Storage Diagnostics - Utility functions to diagnose and report storage issues
 */

export interface StorageDiagnostics {
  totalItems: number;
  totalSize: number;
  usagePercentage: number;
  largestItems: Array<{ key: string; size: number }>;
  budgetmeItems: number;
  supabaseItems: number;
  recommendations: string[];
}

export class StorageDiagnostics {
  /**
   * Get comprehensive storage diagnostics
   */
  static analyze(): StorageDiagnostics {
    const items: Array<{ key: string; size: number; isBudgetMe: boolean; isSupabase: boolean }> = [];
    let totalSize = 0;
    let budgetmeItems = 0;
    let supabaseItems = 0;

    try {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const value = localStorage.getItem(key) || '';
          const size = key.length + value.length;
          const isBudgetMe = key.startsWith('budgetme_') || key.includes('budgetme');
          const isSupabase = key.includes('supabase') || key.includes('auth');
          
          items.push({ key, size, isBudgetMe, isSupabase });
          totalSize += size;
          
          if (isBudgetMe) budgetmeItems++;
          if (isSupabase) supabaseItems++;
        }
      }
    } catch (error) {
      console.error('Error analyzing storage:', error);
    }

    // Sort by size (largest first)
    const largestItems = items
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map(item => ({ key: item.key, size: item.size }));

    const maxSize = 5 * 1024 * 1024; // 5MB estimated limit
    const usagePercentage = (totalSize / maxSize) * 100;

    const recommendations = this.generateRecommendations(totalSize, maxSize, items);

    return {
      totalItems: items.length,
      totalSize,
      usagePercentage,
      largestItems,
      budgetmeItems,
      supabaseItems,
      recommendations
    };
  }

  /**
   * Generate recommendations based on storage analysis
   */
  private static generateRecommendations(totalSize: number, maxSize: number, items: any[]): string[] {
    const recommendations: string[] = [];
    const usagePercentage = (totalSize / maxSize) * 100;

    if (usagePercentage > 90) {
      recommendations.push('Critical: Storage is over 90% full. Immediate cleanup required.');
    } else if (usagePercentage > 80) {
      recommendations.push('Warning: Storage is over 80% full. Consider clearing browser data.');
    } else if (usagePercentage > 60) {
      recommendations.push('Storage usage is high. Monitor for potential issues.');
    }

    // Check for large individual items
    const largeItems = items.filter(item => item.size > 100 * 1024); // 100KB
    if (largeItems.length > 0) {
      recommendations.push(`Found ${largeItems.length} large items taking significant space.`);
    }

    // Check for old items
    const oldAuthItems = items.filter(item => 
      (item.key.includes('supabase') || item.key.includes('auth')) && 
      item.size > 1000
    );
    if (oldAuthItems.length > 5) {
      recommendations.push('Multiple old authentication items found. Clear browser data to remove.');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Storage usage is within normal limits.');
    }

    return recommendations;
  }

  /**
   * Format size in human-readable format
   */
  static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024) * 100) / 100} MB`;
  }

  /**
   * Log storage diagnostics to console
   */
  static logDiagnostics(): void {
    const diagnostics = this.analyze();
    
    console.group('🔍 Storage Diagnostics');
    console.log(`Total Items: ${diagnostics.totalItems}`);
    console.log(`Total Size: ${this.formatSize(diagnostics.totalSize)}`);
    console.log(`Usage: ${diagnostics.usagePercentage.toFixed(1)}%`);
    console.log(`BudgetMe Items: ${diagnostics.budgetmeItems}`);
    console.log(`Supabase Items: ${diagnostics.supabaseItems}`);
    
    console.log('\n📊 Largest Items:');
    diagnostics.largestItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.key}: ${this.formatSize(item.size)}`);
    });

    console.log('\n💡 Recommendations:');
    diagnostics.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    console.groupEnd();
  }

  /**
   * Check if storage is approaching limits
   */
  static isStorageNearLimit(): boolean {
    const diagnostics = this.analyze();
    return diagnostics.usagePercentage > 80;
  }

  /**
   * Get storage summary for UI display
   */
  static getSummary(): { size: string; percentage: number; status: 'good' | 'warning' | 'critical' } {
    const diagnostics = this.analyze();
    let status: 'good' | 'warning' | 'critical' = 'good';
    
    if (diagnostics.usagePercentage > 90) {
      status = 'critical';
    } else if (diagnostics.usagePercentage > 80) {
      status = 'warning';
    }

    return {
      size: this.formatSize(diagnostics.totalSize),
      percentage: Math.round(diagnostics.usagePercentage),
      status
    };
  }
}

// Export for global access in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).storageDiagnostics = StorageDiagnostics;
  console.log('💾 Storage diagnostics available at window.storageDiagnostics');
}

export default StorageDiagnostics;