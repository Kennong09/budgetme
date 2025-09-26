/**
 * Supabase Rate Limiter Service
 * 
 * A client-side rate limiting implementation for Supabase operations
 * to prevent exceeding API limits and provide better user experience
 */

export interface RateLimitConfig {
  maxRequests: number;        // Maximum requests allowed in the time window
  timeWindow: number;         // Time window in milliseconds
  retryDelay: number;         // Delay between retries in milliseconds
  maxRetries: number;         // Maximum number of retries for failed requests
}

export interface RateLimitInfo {
  key: string;                // Unique identifier for the rate limit
  count: number;              // Number of requests made in current window
  lastRequest: number;        // Timestamp of last request
  blockedUntil?: number;      // Timestamp until which requests are blocked
}

export class SupabaseRateLimiter {
  private static readonly DEFAULT_CONFIG: RateLimitConfig = {
    maxRequests: 30,          // 30 requests per minute by default
    timeWindow: 60000,        // 1 minute window
    retryDelay: 1000,         // 1 second retry delay
    maxRetries: 3             // 3 retries max
  };

  private static readonly STORAGE_KEY = 'supabase_rate_limits';
  private static config: RateLimitConfig = { ...SupabaseRateLimiter.DEFAULT_CONFIG };

  /**
   * Configure global rate limiting settings
   */
  static configure(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('Supabase Rate Limiter configured:', this.config);
  }

  /**
   * Check if a request is allowed for the given key
   */
  static isRequestAllowed(key: string): { allowed: boolean; waitTime?: number } {
    const rateLimitInfo = this.getRateLimitInfo(key);
    const now = Date.now();

    // Check if currently blocked
    if (rateLimitInfo.blockedUntil && now < rateLimitInfo.blockedUntil) {
      const waitTime = Math.ceil((rateLimitInfo.blockedUntil - now) / 1000);
      return { allowed: false, waitTime };
    }

    // Reset count if time window has passed
    if (now - rateLimitInfo.lastRequest > this.config.timeWindow) {
      rateLimitInfo.count = 0;
    }

    // Check if within rate limit
    if (rateLimitInfo.count < this.config.maxRequests) {
      return { allowed: true };
    }

    // Would exceed rate limit - block for remainder of time window
    const waitTime = Math.ceil((this.config.timeWindow - (now - rateLimitInfo.lastRequest)) / 1000);
    rateLimitInfo.blockedUntil = now + (waitTime * 1000);
    this.saveRateLimitInfo(key, rateLimitInfo);

    return { allowed: false, waitTime };
  }

  /**
   * Record a request for the given key
   */
  static recordRequest(key: string): void {
    const rateLimitInfo = this.getRateLimitInfo(key);
    const now = Date.now();

    // Reset count if time window has passed
    if (now - rateLimitInfo.lastRequest > this.config.timeWindow) {
      rateLimitInfo.count = 0;
    }

    rateLimitInfo.count++;
    rateLimitInfo.lastRequest = now;
    rateLimitInfo.blockedUntil = undefined; // Clear any block if we're making a request

    this.saveRateLimitInfo(key, rateLimitInfo);
  }

  /**
   * Reset rate limit for a specific key
   */
  static resetRateLimit(key: string): void {
    const rateLimitInfo: RateLimitInfo = {
      key,
      count: 0,
      lastRequest: 0
    };
    this.saveRateLimitInfo(key, rateLimitInfo);
  }

  /**
   * Reset all rate limits
   */
  static resetAllRateLimits(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('All Supabase rate limits reset');
    } catch (error) {
      console.error('Failed to reset rate limits:', error);
    }
  }

  /**
   * Execute a function with rate limiting
   */
  static async executeWithRateLimit<T>(
    key: string,
    fn: () => Promise<T>,
    options?: { retries?: number }
  ): Promise<T> {
    const maxRetries = options?.retries ?? this.config.maxRetries;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const rateCheck = this.isRequestAllowed(key);
      
      if (!rateCheck.allowed) {
        if (attempt <= maxRetries) {
          console.log(`Rate limited for key '${key}', waiting ${rateCheck.waitTime} seconds before retry ${attempt}/${maxRetries}`);
          await this.sleep((rateCheck.waitTime || 1) * 1000);
          continue;
        } else {
          throw new Error(`Rate limit exceeded for '${key}'. Please try again in ${rateCheck.waitTime} seconds.`);
        }
      }

      try {
        this.recordRequest(key);
        return await fn();
      } catch (error: any) {
        // Check if error is rate limit related
        if ((error.status === 429 || error.message?.toLowerCase().includes('rate limit')) && attempt <= maxRetries) {
          console.log(`Rate limit error on attempt ${attempt}, waiting ${this.config.retryDelay}ms before retry`);
          await this.sleep(this.config.retryDelay);
          continue;
        }
        throw error;
      }
    }
    
    throw new Error(`Failed to execute function after ${maxRetries} retries due to rate limiting`);
  }

  /**
   * Get rate limit information for a key
   */
  static getRateLimitStatus(key: string): { 
    allowed: boolean; 
    count: number; 
    maxRequests: number; 
    timeWindow: number;
    waitTime?: number;
    blocked: boolean;
  } {
    const rateLimitInfo = this.getRateLimitInfo(key);
    const now = Date.now();
    const rateCheck = this.isRequestAllowed(key);

    return {
      allowed: rateCheck.allowed,
      count: rateLimitInfo.count,
      maxRequests: this.config.maxRequests,
      timeWindow: this.config.timeWindow,
      waitTime: rateCheck.waitTime,
      blocked: !!rateLimitInfo.blockedUntil && now < rateLimitInfo.blockedUntil
    };
  }

  // Private methods
  private static getRateLimitInfo(key: string): RateLimitInfo {
    try {
      const allLimits = this.getAllRateLimits();
      return allLimits[key] || { key, count: 0, lastRequest: 0 };
    } catch (error) {
      console.warn('Failed to get rate limit info, using defaults:', error);
      return { key, count: 0, lastRequest: 0 };
    }
  }

  private static saveRateLimitInfo(key: string, info: RateLimitInfo): void {
    try {
      const allLimits = this.getAllRateLimits();
      allLimits[key] = info;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allLimits));
    } catch (error) {
      console.warn('Failed to save rate limit info:', error);
    }
  }

  private static getAllRateLimits(): Record<string, RateLimitInfo> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading rate limits:', error);
      return {};
    }
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize with default configuration
console.log('Supabase Rate Limiter initialized with default config');