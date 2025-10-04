/**
 * API Optimization utilities based on the Medium article principles
 * Implements caching, retry logic, background refresh, and monitoring
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
  lastFetched: number;
  staleTime: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface ApiMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  cacheHitRate: number;
}

class ApiOptimizer {
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: ApiMetrics = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    cacheHitRate: 0
  };
  private pendingRequests = new Map<string, Promise<any>>();
  private circuitBreaker = {
    failures: 0,
    lastFailureTime: 0,
    isOpen: false,
    threshold: 5, // Open circuit after 5 consecutive failures
    timeout: 30000 // Keep circuit open for 30 seconds
  };

  /**
   * 1. Cache Like Your Life Depends On It
   * Enhanced caching with stale-while-revalidate pattern
   */
  getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    // Return cached data if not expired
    if (entry.expiry > now) {
      this.metrics.cacheHitRate = (this.metrics.cacheHitRate + 1) / 2;
      return entry.data as T;
    }

    // Remove expired entries
    this.cache.delete(key);
    return null;
  }

  setToCache<T>(key: string, data: T, ttlMs: number = 30000, staleTime: number = 60000): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      expiry: now + ttlMs,
      lastFetched: now,
      staleTime: now + staleTime
    });
  }

  /**
   * 2. Batch Requests Like a Pro
   * Prevents duplicate requests for the same resource
   */
  async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Create new request and store it
    const request = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * 3. Fail Gracefully, Not Loudly
   * Exponential backoff retry logic
   */
  async retryWithBackoff<T>(
    requestFn: () => Promise<T>,
    config: RetryConfig = {
      maxRetries: 2, // Reduced from 3 to 2
      baseDelay: 2000, // Increased from 1000 to 2000
      maxDelay: 8000, // Reduced from 10000 to 8000
      backoffMultiplier: 2
    }
  ): Promise<T> {
    // Check circuit breaker
    if (this.circuitBreaker.isOpen) {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure < this.circuitBreaker.timeout) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      } else {
        // Reset circuit breaker
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failures = 0;
      }
    }

    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await requestFn();
        const responseTime = Date.now() - startTime;
        
        // Update metrics and reset circuit breaker on success
        this.metrics.requestCount++;
        this.metrics.averageResponseTime = 
          (this.metrics.averageResponseTime + responseTime) / 2;
        this.circuitBreaker.failures = 0;
        
        return result;
      } catch (error) {
        lastError = error as Error;
        this.metrics.errorCount++;
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailureTime = Date.now();
        
        // Open circuit breaker if too many failures
        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
          this.circuitBreaker.isOpen = true;
          console.warn('Circuit breaker opened due to repeated failures');
        }
        
        // Don't retry on the last attempt
        if (attempt === config.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );
        
        console.warn(`API request failed (attempt ${attempt + 1}), retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * 4. Use Background Refresh (Don't Block the UI)
   * Stale-while-revalidate pattern
   */
  async getWithBackgroundRefresh<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttlMs: number = 30000,
    staleTime: number = 60000
  ): Promise<T> {
    const cached = this.getFromCache<T>(key);
    const entry = this.cache.get(key);
    
    // Return cached data immediately if available
    if (cached) {
      // If data is stale but not expired, refresh in background
      if (entry && entry.lastFetched + staleTime < Date.now() && entry.expiry > Date.now()) {
        this.backgroundRefresh(key, requestFn, ttlMs, staleTime);
      }
      return cached;
    }
    
    // No cached data, fetch immediately
    const data = await this.retryWithBackoff(requestFn);
    this.setToCache(key, data, ttlMs, staleTime);
    return data;
  }

  private async backgroundRefresh<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttlMs: number,
    staleTime: number
  ): Promise<void> {
    try {
      const data = await this.retryWithBackoff(requestFn);
      this.setToCache(key, data, ttlMs, staleTime);
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }

  /**
   * 5. Monitor From the Client Side
   * Get current API metrics
   */
  getMetrics(): ApiMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear cache entries
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const apiOptimizer = new ApiOptimizer();

// Export types
export type { CacheEntry, RetryConfig, ApiMetrics };
