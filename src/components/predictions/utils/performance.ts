import { PerformanceMetrics, PredictionError } from '../../../types';

/**
 * Performance monitoring utility for prediction components
 */
export class PredictionPerformanceMonitor {
  private static metrics: PerformanceMetrics = {
    apiResponseTime: 0,
    predictionGenerationTime: 0,
    cacheHitRate: 0,
    errorRate: 0
  };

  private static requestTimes: number[] = [];
  private static cacheHits = 0;
  private static cacheRequests = 0;
  private static errors = 0;
  private static totalRequests = 0;

  /**
   * Tracks API response time
   */
  static trackApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    this.totalRequests++;

    return apiCall()
      .then(result => {
        const duration = performance.now() - startTime;
        this.requestTimes.push(duration);
        this.updateMetrics();
        return result;
      })
      .catch(error => {
        const duration = performance.now() - startTime;
        this.requestTimes.push(duration);
        this.errors++;
        this.updateMetrics();
        throw error;
      });
  }

  /**
   * Tracks cache performance
   */
  static trackCacheHit(): void {
    this.cacheHits++;
    this.cacheRequests++;
    this.updateMetrics();
  }

  /**
   * Tracks cache miss
   */
  static trackCacheMiss(): void {
    this.cacheRequests++;
    this.updateMetrics();
  }

  /**
   * Updates performance metrics
   */
  private static updateMetrics(): void {
    // Calculate average API response time
    if (this.requestTimes.length > 0) {
      this.metrics.apiResponseTime = 
        this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length;
    }

    // Calculate cache hit rate
    if (this.cacheRequests > 0) {
      this.metrics.cacheHitRate = (this.cacheHits / this.cacheRequests) * 100;
    }

    // Calculate error rate
    if (this.totalRequests > 0) {
      this.metrics.errorRate = (this.errors / this.totalRequests) * 100;
    }

    // Keep only last 100 request times to prevent memory issues
    if (this.requestTimes.length > 100) {
      this.requestTimes = this.requestTimes.slice(-100);
    }
  }

  /**
   * Gets current performance metrics
   */
  static getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Resets performance metrics
   */
  static reset(): void {
    this.metrics = {
      apiResponseTime: 0,
      predictionGenerationTime: 0,
      cacheHitRate: 0,
      errorRate: 0
    };
    this.requestTimes = [];
    this.cacheHits = 0;
    this.cacheRequests = 0;
    this.errors = 0;
    this.totalRequests = 0;
  }

  /**
   * Creates a performance-optimized version of a function with debouncing
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Creates a throttled version of a function
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Measures execution time of a function
   */
  static async measureExecutionTime<T>(
    name: string,
    func: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await func();
      const duration = performance.now() - startTime;
      console.log(`${name} execution time: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`${name} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * Creates an error boundary for prediction operations
   */
  static withErrorBoundary<T>(
    operation: () => Promise<T>,
    fallback: () => T,
    onError?: (error: Error) => void
  ): Promise<T> {
    return operation().catch(error => {
      console.error('Prediction operation failed:', error);
      
      if (onError) {
        onError(error);
      }

      this.errors++;
      this.updateMetrics();

      return fallback();
    });
  }

  /**
   * Optimizes real-time subscription management
   */
  static createOptimizedSubscription(
    subscribeFunction: () => () => void,
    debounceDelay: number = 1000
  ): () => void {
    let cleanup: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout;

    const debouncedSubscribe = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (cleanup) {
          cleanup();
        }
        cleanup = subscribeFunction();
      }, debounceDelay);
    };

    debouncedSubscribe();

    return () => {
      clearTimeout(timeoutId);
      if (cleanup) {
        cleanup();
      }
    };
  }
}

/**
 * Error boundary wrapper for React components
 */
export class PredictionErrorBoundary {
  static createErrorHandler(
    componentName: string,
    onError?: (error: PredictionError) => void
  ) {
    return (error: Error) => {
      const predictionError: PredictionError = {
        code: 'COMPONENT_ERROR',
        message: `Error in ${componentName}: ${error.message}`,
        context: { componentName, stack: error.stack },
        recoverable: true,
        timestamp: new Date()
      };

      console.error(`Prediction component error in ${componentName}:`, predictionError);

      if (onError) {
        onError(predictionError);
      }

      // Track error for performance monitoring
      PredictionPerformanceMonitor.trackApiCall(() => Promise.reject(error))
        .catch(() => {}); // Ignore the error since we're just tracking it
    };
  }

  /**
   * Creates a safe async operation wrapper
   */
  static safeAsync<T>(
    operation: () => Promise<T>,
    fallback: T,
    errorHandler?: (error: Error) => void
  ): Promise<T> {
    return operation().catch(error => {
      if (errorHandler) {
        errorHandler(error);
      }
      return fallback;
    });
  }
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  private static intervals: Set<NodeJS.Timeout> = new Set();

  /**
   * Creates a memory-optimized interval that auto-cleans up
   */
  static createOptimizedInterval(
    callback: () => void,
    delay: number,
    maxExecutions?: number
  ): () => void {
    let executions = 0;
    
    const intervalId = setInterval(() => {
      callback();
      executions++;
      
      if (maxExecutions && executions >= maxExecutions) {
        clearInterval(intervalId);
        this.intervals.delete(intervalId);
      }
    }, delay);

    this.intervals.add(intervalId);

    return () => {
      clearInterval(intervalId);
      this.intervals.delete(intervalId);
    };
  }

  /**
   * Clears all active intervals
   */
  static clearAllIntervals(): void {
    this.intervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.intervals.clear();
  }

  /**
   * Gets memory usage statistics
   */
  static getMemoryStats(): { intervalsCount: number } {
    return {
      intervalsCount: this.intervals.size
    };
  }
}