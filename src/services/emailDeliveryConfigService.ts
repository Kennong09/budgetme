/**
 * Email Delivery Configuration Service
 * 
 * Manages email delivery settings and provides utilities
 * for optimizing authentication email performance
 */

export interface EmailConfig {
  deliveryTimeout: number; // Maximum expected delivery time in milliseconds
  retryInterval: number; // Time between resend attempts
  maxRetries: number; // Maximum number of retry attempts
  rateLimitWindow: number; // Rate limiting window in milliseconds
  monitoringEnabled: boolean; // Whether to enable delivery monitoring
  debugMode: boolean; // Enable verbose logging
}

export class EmailDeliveryConfigService {
  private static readonly DEFAULT_CONFIG: EmailConfig = {
    deliveryTimeout: 300000, // 5 minutes
    retryInterval: 30000, // 30 seconds
    maxRetries: 3,
    rateLimitWindow: 120000, // 2 minutes for Gmail SMTP limitations
    monitoringEnabled: true,
    debugMode: process.env.NODE_ENV === 'development'
  };

  private static readonly CONFIG_KEY = 'budgetme_email_config';

  /**
   * Get current email configuration
   */
  static getConfig(): EmailConfig {
    try {
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        return { ...this.DEFAULT_CONFIG, ...config };
      }
    } catch (error) {
      console.warn('Failed to load email config, using defaults:', error);
    }
    
    return this.DEFAULT_CONFIG;
  }

  /**
   * Update email configuration
   */
  static updateConfig(updates: Partial<EmailConfig>): void {
    const currentConfig = this.getConfig();
    const newConfig = { ...currentConfig, ...updates };
    
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(newConfig));
      console.log('Email configuration updated:', updates);
    } catch (error) {
      console.error('Failed to save email config:', error);
    }
  }

  /**
   * Reset configuration to defaults
   */
  static resetToDefaults(): void {
    try {
      localStorage.removeItem(this.CONFIG_KEY);
      console.log('Email configuration reset to defaults');
    } catch (error) {
      console.error('Failed to reset email config:', error);
    }
  }

  /**
   * Get optimized Supabase auth options for email delivery
   */
  static getOptimizedAuthOptions(siteUrl: string) {
    const config = this.getConfig();
    
    return {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      // Optimized for faster delivery
      data: undefined, // Remove unnecessary metadata for faster processing
      captchaToken: undefined, // Can be enabled later for security
    };
  }

  /**
   * Check if email delivery should be considered delayed
   */
  static isDeliveryDelayed(sentAt: string): boolean {
    const config = this.getConfig();
    const timeSinceSent = Date.now() - new Date(sentAt).getTime();
    return timeSinceSent > config.deliveryTimeout;
  }

  /**
   * Check if resend is allowed based on rate limiting
   */
  static isResendAllowed(lastResendAt?: string): { allowed: boolean; waitTime?: number } {
    if (!lastResendAt) {
      return { allowed: true };
    }

    const config = this.getConfig();
    const timeSinceLastResend = Date.now() - parseInt(lastResendAt);
    
    if (timeSinceLastResend < config.rateLimitWindow) {
      const waitTime = Math.ceil((config.rateLimitWindow - timeSinceLastResend) / 1000);
      return { allowed: false, waitTime };
    }

    return { allowed: true };
  }

  /**
   * Check if signup is allowed based on rate limiting
   * Uses a longer rate limit window for signups due to Gmail SMTP restrictions
   */
  static isSignupAllowed(lastSignupAt?: string): { allowed: boolean; waitTime?: number } {
    if (!lastSignupAt) {
      return { allowed: true };
    }

    const config = this.getConfig();
    // Use 2x the rate limit window for signups to be more conservative
    const signupRateLimit = config.rateLimitWindow * 2;
    const timeSinceLastSignup = Date.now() - parseInt(lastSignupAt);
    
    if (timeSinceLastSignup < signupRateLimit) {
      const waitTime = Math.ceil((signupRateLimit - timeSinceLastSignup) / 1000);
      return { allowed: false, waitTime };
    }

    return { allowed: true };
  }

  /**
   * Get recommended email template based on performance requirements
   */
  static getRecommendedTemplate(): 'optimized' | 'standard' {
    // For production, recommend optimized template for better performance
    if (process.env.NODE_ENV === 'production') {
      return 'optimized';
    }
    
    // For development, standard template is fine
    return 'standard';
  }

  /**
   * Log email delivery metrics
   */
  static logDeliveryMetrics(metrics: {
    email: string;
    deliveryTime?: number;
    retryCount: number;
    success: boolean;
    error?: string;
  }): void {
    const config = this.getConfig();
    
    if (!config.debugMode && !config.monitoringEnabled) {
      return;
    }

    const logData = {
      timestamp: new Date().toISOString(),
      ...metrics
    };

    if (config.debugMode) {
      console.log('Email Delivery Metrics:', logData);
    }

    // Store metrics for analytics (could be sent to monitoring service)
    try {
      const metricsKey = 'budgetme_email_metrics';
      const existingMetrics = JSON.parse(localStorage.getItem(metricsKey) || '[]');
      existingMetrics.push(logData);
      
      // Keep only last 100 entries to prevent storage bloat
      if (existingMetrics.length > 100) {
        existingMetrics.splice(0, existingMetrics.length - 100);
      }
      
      localStorage.setItem(metricsKey, JSON.stringify(existingMetrics));
    } catch (error) {
      console.warn('Failed to store email metrics:', error);
    }
  }

  /**
   * Get email delivery analytics
   */
  static getDeliveryAnalytics(): {
    totalEmails: number;
    successRate: number;
    averageDeliveryTime: number;
    commonErrors: string[];
  } {
    try {
      const metricsData = JSON.parse(localStorage.getItem('budgetme_email_metrics') || '[]');
      
      if (metricsData.length === 0) {
        return {
          totalEmails: 0,
          successRate: 0,
          averageDeliveryTime: 0,
          commonErrors: []
        };
      }

      const successful = metricsData.filter((m: any) => m.success);
      const successRate = (successful.length / metricsData.length) * 100;
      
      const deliveryTimes = successful
        .filter((m: any) => m.deliveryTime)
        .map((m: any) => m.deliveryTime);
      
      const averageDeliveryTime = deliveryTimes.length > 0
        ? deliveryTimes.reduce((a: number, b: number) => a + b, 0) / deliveryTimes.length
        : 0;

      const errors = metricsData
        .filter((m: any) => !m.success && m.error)
        .map((m: any) => m.error);
      
      const errorCounts: { [key: string]: number } = {};
      errors.forEach((error: string) => {
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      });

      const commonErrors = Object.entries(errorCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([error]) => error);

      return {
        totalEmails: metricsData.length,
        successRate: Math.round(successRate * 100) / 100,
        averageDeliveryTime: Math.round(averageDeliveryTime / 1000), // Convert to seconds
        commonErrors
      };
    } catch (error) {
      console.error('Failed to get delivery analytics:', error);
      return {
        totalEmails: 0,
        successRate: 0,
        averageDeliveryTime: 0,
        commonErrors: []
      };
    }
  }
}