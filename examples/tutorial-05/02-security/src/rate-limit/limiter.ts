/**
 * Rate Limiter
 * Implements rate limiting to prevent abuse
 */

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      maxRequests: options.maxRequests,
      windowMs: options.windowMs,
      keyGenerator: options.keyGenerator || ((id) => id)
    };
  }

  /**
   * Check if request is allowed
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const key = this.options.keyGenerator(identifier);
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    // Get existing requests
    let timestamps = this.requests.get(key) || [];

    // Remove old requests outside window
    timestamps = timestamps.filter(ts => ts > windowStart);

    // Check if limit exceeded
    const allowed = timestamps.length < this.options.maxRequests;

    // Add current request
    if (allowed) {
      timestamps.push(now);
    }

    // Update storage
    this.requests.set(key, timestamps);

    // Calculate reset time
    const resetTime = timestamps.length > 0
      ? timestamps[0] + this.options.windowMs
      : now + this.options.windowMs;

    return {
      allowed,
      remaining: Math.max(0, this.options.maxRequests - timestamps.length),
      resetTime
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    const key = this.options.keyGenerator(identifier);
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter(ts => ts > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }
}
