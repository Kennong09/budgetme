/**
 * Enhanced logging utility for budget fallback system
 * Provides structured logging with different levels and data source tracking
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  action: string;
  dataSource?: string;
  success?: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

class BudgetLogger {
  private static instance: BudgetLogger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 log entries
  
  public static getInstance(): BudgetLogger {
    if (!BudgetLogger.instance) {
      BudgetLogger.instance = new BudgetLogger();
    }
    return BudgetLogger.instance;
  }

  /**
   * Log a general message
   */
  log(level: LogLevel, component: string, action: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      action,
      metadata
    };
    
    this.addLogEntry(entry);
    this.consoleLog(entry);
  }

  /**
   * Log expected fallback attempt (less verbose than error logging)
   */
  logFallbackAttempt(
    component: string, 
    fromSource: string, 
    toSource: string, 
    reason: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      component,
      action: 'fallback_attempt',
      success: true,
      metadata: {
        fromSource,
        toSource,
        reason
      }
    };
    
    this.addLogEntry(entry);
    
    // Only show in development mode
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${component}] Fallback: ${fromSource} → ${toSource} (${reason})`);
    }
  }

  /**
   * Log data source usage for monitoring fallback patterns
   */
  logDataSourceUsage(
    component: string, 
    dataSource: string, 
    success: boolean, 
    error?: string, 
    metadata?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: success ? LogLevel.INFO : LogLevel.DEBUG, // Changed from ERROR to DEBUG for failed attempts
      component,
      action: 'data_source_access',
      dataSource,
      success,
      error,
      metadata
    };
    
    this.addLogEntry(entry);
    
    // Only log to console if it's a success or if it's development mode
    if (success || process.env.NODE_ENV === 'development') {
      this.consoleLog(entry);
    }
    
    // In production, this could send metrics to monitoring service
    // Example: analytics.track('budget_data_source_usage', entry);
  }

  /**
   * Log component error with context
   */
  logError(
    component: string, 
    action: string, 
    error: Error | string, 
    metadata?: Record<string, any>
  ): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      component,
      action,
      success: false,
      error: errorMessage,
      metadata: {
        ...metadata,
        stack: error instanceof Error ? error.stack : undefined
      }
    };
    
    this.addLogEntry(entry);
    this.consoleLog(entry);
  }

  /**
   * Log user action for analytics
   */
  logUserAction(
    component: string, 
    action: string, 
    success: boolean = true, 
    metadata?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: success ? LogLevel.INFO : LogLevel.WARN,
      component,
      action,
      success,
      metadata
    };
    
    this.addLogEntry(entry);
    this.consoleLog(entry);
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by component
   */
  getLogsByComponent(component: string, count: number = 50): LogEntry[] {
    return this.logs
      .filter(log => log.component === component)
      .slice(-count);
  }

  /**
   * Get data source usage statistics
   */
  getDataSourceStats(): Record<string, { total: number; success: number; failure: number }> {
    const stats: Record<string, { total: number; success: number; failure: number }> = {};
    
    this.logs
      .filter(log => log.action === 'data_source_access' && log.dataSource)
      .forEach(log => {
        const source = log.dataSource!;
        if (!stats[source]) {
          stats[source] = { total: 0, success: 0, failure: 0 };
        }
        stats[source].total++;
        if (log.success) {
          stats[source].success++;
        } else {
          stats[source].failure++;
        }
      });
    
    return stats;
  }

  /**
   * Clear old logs to prevent memory issues
   */
  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Output to browser console with appropriate formatting
   */
  private consoleLog(entry: LogEntry): void {
    const message = `[${entry.component}] ${entry.action}`;
    const details = {
      ...entry.metadata,
      ...(entry.dataSource && { dataSource: entry.dataSource }),
      ...(entry.error && { error: entry.error })
    };
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, details);
        break;
      case LogLevel.INFO:
        console.info(message, details);
        break;
      case LogLevel.WARN:
        console.warn(message, details);
        break;
      case LogLevel.ERROR:
        console.error(message, details);
        break;
    }
  }

  /**
   * Export logs for support/debugging (development only)
   */
  exportLogs(): string {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Log export is only available in development mode');
      return '';
    }
    
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Generate summary report for system health
   */
  generateHealthReport(): {
    totalLogs: number;
    errorCount: number;
    dataSourceStats: Record<string, any>;
    recentErrors: LogEntry[];
  } {
    const errorLogs = this.logs.filter(log => log.level === LogLevel.ERROR);
    const recentErrors = errorLogs.slice(-10);
    
    return {
      totalLogs: this.logs.length,
      errorCount: errorLogs.length,
      dataSourceStats: this.getDataSourceStats(),
      recentErrors
    };
  }
}

// Export singleton instance
export const budgetLogger = BudgetLogger.getInstance();

// Convenience functions
export const logDataSourceUsage = (
  component: string, 
  dataSource: string, 
  success: boolean, 
  error?: string, 
  metadata?: Record<string, any>
) => budgetLogger.logDataSourceUsage(component, dataSource, success, error, metadata);

export const logFallbackAttempt = (
  component: string, 
  fromSource: string, 
  toSource: string, 
  reason: string
) => budgetLogger.logFallbackAttempt(component, fromSource, toSource, reason);

export const logError = (
  component: string, 
  action: string, 
  error: Error | string, 
  metadata?: Record<string, any>
) => budgetLogger.logError(component, action, error, metadata);

export const logUserAction = (
  component: string, 
  action: string, 
  success?: boolean, 
  metadata?: Record<string, any>
) => budgetLogger.logUserAction(component, action, success, metadata);

export const logInfo = (
  component: string, 
  action: string, 
  metadata?: Record<string, any>
) => budgetLogger.log(LogLevel.INFO, component, action, metadata);

export const logWarn = (
  component: string, 
  action: string, 
  metadata?: Record<string, any>
) => budgetLogger.log(LogLevel.WARN, component, action, metadata);

export default budgetLogger;