/**
 * Email Monitoring Service
 * 
 * Tracks email delivery performance and provides insights
 * for authentication email optimization
 */

export interface EmailDeliveryStatus {
  email: string;
  sentAt: string;
  deliveredAt?: string;
  status: 'sent' | 'delivered' | 'failed' | 'expired';
  retryCount: number;
  lastRetryAt?: string;
}

export class EmailMonitoringService {
  private static readonly STORAGE_KEY = 'budgetme_email_tracking';
  private static readonly DELIVERY_TIMEOUT = 300000; // 5 minutes
  private static readonly EXPIRY_TIME = 86400000; // 24 hours

  /**
   * Track email delivery attempt
   */
  static trackEmailSent(email: string): void {
    const tracking: EmailDeliveryStatus = {
      email,
      sentAt: new Date().toISOString(),
      status: 'sent',
      retryCount: 0
    };

    this.saveTrackingData(email, tracking);
    console.log('Email delivery tracked:', { email, sentAt: tracking.sentAt });
  }

  /**
   * Track email delivery confirmation
   */
  static confirmEmailDelivered(email: string): void {
    const tracking = this.getTrackingData(email);
    if (tracking) {
      tracking.deliveredAt = new Date().toISOString();
      tracking.status = 'delivered';
      this.saveTrackingData(email, tracking);
      
      const deliveryTime = new Date(tracking.deliveredAt).getTime() - new Date(tracking.sentAt).getTime();
      console.log('Email delivery confirmed:', { 
        email, 
        deliveryTime: `${Math.round(deliveryTime / 1000)}s` 
      });
    }
  }

  /**
   * Track email resend attempt
   */
  static trackEmailResent(email: string): void {
    const tracking = this.getTrackingData(email);
    if (tracking) {
      tracking.retryCount += 1;
      tracking.lastRetryAt = new Date().toISOString();
      tracking.status = 'sent'; // Reset to sent status
      this.saveTrackingData(email, tracking);
      
      console.log('Email resend tracked:', { 
        email, 
        retryCount: tracking.retryCount,
        lastRetryAt: tracking.lastRetryAt 
      });
    }
  }

  /**
   * Get delivery status for an email
   */
  static getDeliveryStatus(email: string): EmailDeliveryStatus | null {
    return this.getTrackingData(email);
  }

  /**
   * Check if email delivery is considered delayed
   */
  static isDeliveryDelayed(email: string): boolean {
    const tracking = this.getTrackingData(email);
    if (!tracking || tracking.status !== 'sent') {
      return false;
    }

    const timeSinceSent = Date.now() - new Date(tracking.sentAt).getTime();
    return timeSinceSent > this.DELIVERY_TIMEOUT;
  }

  /**
   * Check if email has expired
   */
  static isEmailExpired(email: string): boolean {
    const tracking = this.getTrackingData(email);
    if (!tracking) {
      return false;
    }

    const timeSinceSent = Date.now() - new Date(tracking.sentAt).getTime();
    return timeSinceSent > this.EXPIRY_TIME;
  }

  /**
   * Get delivery statistics
   */
  static getDeliveryStats(): {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    averageDeliveryTime: number;
    deliveryRate: number;
  } {
    const allTracking = this.getAllTrackingData();
    const delivered = allTracking.filter(t => t.status === 'delivered');
    const failed = allTracking.filter(t => t.status === 'failed');

    let totalDeliveryTime = 0;
    delivered.forEach(t => {
      if (t.deliveredAt) {
        const deliveryTime = new Date(t.deliveredAt).getTime() - new Date(t.sentAt).getTime();
        totalDeliveryTime += deliveryTime;
      }
    });

    const averageDeliveryTime = delivered.length > 0 ? totalDeliveryTime / delivered.length : 0;
    const deliveryRate = allTracking.length > 0 ? (delivered.length / allTracking.length) * 100 : 0;

    return {
      totalSent: allTracking.length,
      totalDelivered: delivered.length,
      totalFailed: failed.length,
      averageDeliveryTime: Math.round(averageDeliveryTime / 1000), // Convert to seconds
      deliveryRate: Math.round(deliveryRate * 100) / 100 // Round to 2 decimal places
    };
  }

  /**
   * Get detailed delivery information for a specific email
   */
  static getEmailDeliveryInfo(email: string): EmailDeliveryStatus | null {
    return this.getTrackingData(email);
  }

  /**
   * Clean up expired tracking data
   */
  static cleanupExpiredData(): void {
    const allTracking = this.getAllTrackingData();
    const currentTime = Date.now();
    
    const activeTracking = allTracking.filter(tracking => {
      const timeSinceSent = currentTime - new Date(tracking.sentAt).getTime();
      return timeSinceSent <= this.EXPIRY_TIME;
    });

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(activeTracking));
    console.log('Cleaned up expired email tracking data');
  }

  // Private methods
  private static saveTrackingData(email: string, tracking: EmailDeliveryStatus): void {
    const allTracking = this.getAllTrackingData();
    const existingIndex = allTracking.findIndex(t => t.email === email);
    
    if (existingIndex >= 0) {
      allTracking[existingIndex] = tracking;
    } else {
      allTracking.push(tracking);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allTracking));
  }

  private static getTrackingData(email: string): EmailDeliveryStatus | null {
    const allTracking = this.getAllTrackingData();
    return allTracking.find(t => t.email === email) || null;
  }

  private static getAllTrackingData(): EmailDeliveryStatus[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading email tracking data:', error);
      return [];
    }
  }
}

// Auto-cleanup on service load
EmailMonitoringService.cleanupExpiredData();