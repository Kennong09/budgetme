/**
 * Email Delivery Diagnostics
 * 
 * Utility functions to diagnose and troubleshoot email delivery issues
 */

import { EmailMonitoringService } from '../services/emailMonitoringService';
import { EmailDeliveryConfigService } from '../services/emailDeliveryConfigService';
import { env } from './env';

export interface EmailDiagnosticsReport {
  config: any;
  deliveryStats: any;
  recentDeliveries: any[];
  issues: string[];
  recommendations: string[];
}

export class EmailDiagnostics {
  /**
   * Generate a comprehensive email diagnostics report
   */
  static generateReport(): EmailDiagnosticsReport {
    const config = EmailDeliveryConfigService.getConfig();
    const deliveryStats = EmailMonitoringService.getDeliveryStats();
    const recentDeliveries = this.getRecentDeliveries(10);
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for configuration issues
    if (config.rateLimitWindow < 120000) { // Less than 2 minutes
      issues.push('Rate limit window is too short for Gmail SMTP');
      recommendations.push('Increase rate limit window to at least 2 minutes');
    }

    if (config.deliveryTimeout < 300000) { // Less than 5 minutes
      issues.push('Delivery timeout is too short');
      recommendations.push('Increase delivery timeout to at least 5 minutes');
    }

    // Check delivery stats for issues
    if (deliveryStats.totalSent > 0) {
      if (deliveryStats.deliveryRate < 80) {
        issues.push(`Low delivery rate: ${deliveryStats.deliveryRate}%`);
        recommendations.push('Check SMTP configuration and consider switching to a professional email service');
      }

      if (deliveryStats.averageDeliveryTime > 60) { // More than 1 minute
        issues.push(`Slow delivery time: ${deliveryStats.averageDeliveryTime} seconds`);
        recommendations.push('Delivery times are slow, consider switching to a professional email service');
      }
    }

    // Check for recent failed deliveries
    const recentFailed = recentDeliveries.filter(d => d.status === 'failed');
    if (recentFailed.length > 0) {
      issues.push(`Recent delivery failures: ${recentFailed.length}`);
      recommendations.push('Check recent failed deliveries for error patterns');
    }

    // Check for delayed deliveries
    const delayedDeliveries = recentDeliveries.filter(d => 
      d.status === 'sent' && 
      (Date.now() - new Date(d.sentAt).getTime() > 300000) // 5 minutes
    );
    
    if (delayedDeliveries.length > 0) {
      issues.push(`Delayed deliveries: ${delayedDeliveries.length}`);
      recommendations.push('Some emails are taking longer than expected to deliver');
    }

    return {
      config,
      deliveryStats,
      recentDeliveries,
      issues,
      recommendations
    };
  }

  /**
   * Get recent email deliveries
   */
  static getRecentDeliveries(limit: number = 10): any[] {
    try {
      const allTracking = EmailMonitoringService.getAllTrackingData();
      // Sort by sent time, newest first
      const sorted = allTracking.sort((a, b) => 
        new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      );
      return sorted.slice(0, limit);
    } catch (error) {
      console.error('Error getting recent deliveries:', error);
      return [];
    }
  }

  /**
   * Check if an email was sent recently
   */
  static wasEmailSentRecently(email: string, minutes: number = 10): boolean {
    const deliveryInfo = EmailMonitoringService.getEmailDeliveryInfo(email);
    if (!deliveryInfo) return false;

    const timeSinceSent = Date.now() - new Date(deliveryInfo.sentAt).getTime();
    return timeSinceSent <= (minutes * 60 * 1000);
  }

  /**
   * Get detailed information about a specific email
   */
  static getEmailInfo(email: string): any {
    return EmailMonitoringService.getEmailDeliveryInfo(email);
  }

  /**
   * Clear email tracking data
   */
  static clearTrackingData(): void {
    try {
      localStorage.removeItem(EmailMonitoringService.STORAGE_KEY);
      console.log('Email tracking data cleared');
    } catch (error) {
      console.error('Error clearing tracking data:', error);
    }
  }

  /**
   * Test email configuration
   */
  static testConfiguration(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check if SITE_URL is set
    const siteUrl = env.SITE_URL;
    if (!siteUrl || siteUrl === window.location.origin) {
      issues.push('SITE_URL environment variable is not explicitly set (using window.location.origin as fallback)');
    }

    // Check email delivery config
    const config = EmailDeliveryConfigService.getConfig();
    if (config.rateLimitWindow < 60000) {
      issues.push('Rate limit window is very short');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Print a diagnostic report to console
   */
  static printReport(): void {
    const report = this.generateReport();
    
    console.log('=== EMAIL DELIVERY DIAGNOSTICS REPORT ===');
    console.log('Configuration:', report.config);
    console.log('Delivery Stats:', report.deliveryStats);
    console.log('Recent Deliveries:', report.recentDeliveries);
    console.log('Issues Found:', report.issues);
    console.log('Recommendations:', report.recommendations);
    console.log('=========================================');
  }
}

export default EmailDiagnostics;