/**
 * Enhanced error handling utilities for family dashboard charts
 */

export interface ChartError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  timestamp: Date;
}

export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoff: boolean;
}

export interface FallbackData {
  categoryExpenses: any[];
  budgetPerformance: any;
  goalProgress: any[];
  financialSummary: any;
}

/**
 * Enhanced error handling class for chart components
 */
export class ChartErrorHandler {
  private static instance: ChartErrorHandler;
  private errorLog: ChartError[] = [];
  private maxLogSize = 100;

  public static getInstance(): ChartErrorHandler {
    if (!ChartErrorHandler.instance) {
      ChartErrorHandler.instance = new ChartErrorHandler();
    }
    return ChartErrorHandler.instance;
  }

  /**
   * Create a standardized chart error
   */
  createError(
    code: string, 
    message: string, 
    details?: any, 
    recoverable: boolean = true
  ): ChartError {
    return {
      code,
      message,
      details,
      recoverable,
      timestamp: new Date()
    };
  }

  /**
   * Log error with context
   */
  logError(error: ChartError, context?: { familyId?: string; chartType?: string }) {
    const errorWithContext = {
      ...error,
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: error.timestamp.toISOString()
      }
    };

    // Add to internal log
    this.errorLog.unshift(errorWithContext);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop();
    }

    // Console logging with appropriate level
    if (error.recoverable) {
      console.warn('Chart Warning:', errorWithContext);
    } else {
      console.error('Chart Error:', errorWithContext);
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(errorWithContext);
    }
  }

  /**
   * Retry function with exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = { maxAttempts: 3, delay: 1000, backoff: true }
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === options.maxAttempts) {
          break;
        }

        const delay = options.backoff 
          ? options.delay * Math.pow(2, attempt - 1)
          : options.delay;
        
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Handle network-related errors
   */
  handleNetworkError(error: any, context?: any): ChartError {
    if (error.name === 'AbortError') {
      return this.createError(
        'REQUEST_ABORTED',
        'Request was cancelled',
        { originalError: error, context },
        true
      );
    }

    if (error.message?.includes('fetch')) {
      return this.createError(
        'NETWORK_ERROR',
        'Network connection failed. Please check your internet connection.',
        { originalError: error, context },
        true
      );
    }

    if (error.status >= 400 && error.status < 500) {
      return this.createError(
        'CLIENT_ERROR',
        'Invalid request. Please refresh the page and try again.',
        { status: error.status, originalError: error, context },
        true
      );
    }

    if (error.status >= 500) {
      return this.createError(
        'SERVER_ERROR',
        'Server error. Please try again later.',
        { status: error.status, originalError: error, context },
        true
      );
    }

    return this.createError(
      'UNKNOWN_NETWORK_ERROR',
      'An unexpected network error occurred.',
      { originalError: error, context },
      true
    );
  }

  /**
   * Handle data validation errors
   */
  handleDataError(error: any, context?: any): ChartError {
    if (error.message?.includes('validation')) {
      return this.createError(
        'DATA_VALIDATION_ERROR',
        'Data validation failed. The received data is invalid.',
        { originalError: error, context },
        false
      );
    }

    if (error.message?.includes('parse') || error.message?.includes('JSON')) {
      return this.createError(
        'DATA_PARSE_ERROR',
        'Failed to parse response data.',
        { originalError: error, context },
        true
      );
    }

    return this.createError(
      'DATA_ERROR',
      'Data processing error occurred.',
      { originalError: error, context },
      true
    );
  }

  /**
   * Handle permission/authentication errors
   */
  handleAuthError(error: any, context?: any): ChartError {
    if (error.status === 401) {
      return this.createError(
        'UNAUTHORIZED',
        'Your session has expired. Please log in again.',
        { originalError: error, context },
        false
      );
    }

    if (error.status === 403) {
      return this.createError(
        'FORBIDDEN',
        'You do not have permission to access this data.',
        { originalError: error, context },
        false
      );
    }

    return this.createError(
      'AUTH_ERROR',
      'Authentication error occurred.',
      { originalError: error, context },
      false
    );
  }

  /**
   * Get fallback data for graceful degradation
   */
  getFallbackData(): FallbackData {
    return {
      categoryExpenses: [],
      budgetPerformance: {
        total_family_income: 0,
        total_family_expenses: 0,
        budget_utilization: 0,
        savings_rate: 0,
        family_financial_health: 0,
        budget_efficiency: 0,
        member_count: 1
      },
      goalProgress: [],
      financialSummary: {
        total_family_income: 0,
        total_family_expenses: 0,
        budget_utilization: 0,
        savings_rate: 0,
        healthMetrics: {
          financial_health_score: 0,
          expense_control_score: 0,
          savings_discipline_score: 0,
          budget_planning_score: 0,
          overall_grade: 'N/A',
          overall_status: 'No Data'
        },
        member_count: 1
      }
    };
  }

  /**
   * Determine if an error is recoverable
   */
  isRecoverable(error: any): boolean {
    // Network timeouts are recoverable
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Temporary server errors are recoverable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Rate limiting is recoverable
    if (error.status === 429) {
      return true;
    }

    // Client errors are generally not recoverable
    if (error.status >= 400 && error.status < 500) {
      return false;
    }

    // Unknown errors are considered recoverable
    return true;
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit: number = 10): ChartError[] {
    return this.errorLog.slice(0, limit);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send error to monitoring service (placeholder)
   */
  private sendToMonitoringService(error: any): void {
    // Placeholder for external monitoring service integration
    // e.g., Sentry, LogRocket, DataDog, etc.
    // 
    // Example:
    // Sentry.captureException(error.originalError, {
    //   tags: {
    //     component: 'chart',
    //     errorCode: error.code
    //   },
    //   extra: error.context
    // });
  }
}

// Export singleton instance
export const chartErrorHandler = ChartErrorHandler.getInstance();

export default chartErrorHandler;