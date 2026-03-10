/**
 * Performance Monitor
 * Tracks and analyzes performance metrics
 */

import { EventEmitter } from 'events';

export interface OperationTiming {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  queryLatency: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    operationsPerSecond: number;
    queriesPerSecond: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    size: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  errors: {
    count: number;
    rate: number;
  };
}

export interface PerformanceOptions {
  enabled?: boolean;
  samplingRate?: number;
  maxSamples?: number;
  retentionMs?: number;
}

export class PerformanceMonitor extends EventEmitter {
  private timings: OperationTiming[] = [];
  private options: Required<PerformanceOptions>;
  private metricsCache?: PerformanceMetrics;
  private cacheTimeout = 1000; // 1 second

  constructor(options: PerformanceOptions = {}) {
    super();
    this.options = {
      enabled: options.enabled ?? true,
      samplingRate: options.samplingRate ?? 1.0,
      maxSamples: options.maxSamples ?? 10000,
      retentionMs: options.retentionMs ?? 3600000 // 1 hour
    };
  }

  /**
   * Track an operation
   */
  async trackOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.options.enabled || Math.random() > this.options.samplingRate) {
      return fn();
    }

    const startTime = Date.now();
    let success = false;
    let result: T;

    try {
      result = await fn();
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const endTime = Date.now();
      const timing: OperationTiming = {
        operation,
        startTime,
        endTime,
        duration: endTime - startTime,
        success,
        metadata
      };

      this.addTiming(timing);
    }
  }

  /**
   * Add timing record
   */
  private addTiming(timing: OperationTiming): void {
    this.timings.push(timing);

    // Trim old samples
    const cutoff = Date.now() - this.options.retentionMs;
    this.timings = this.timings.filter(t => t.startTime > cutoff);

    // Limit max samples
    if (this.timings.length > this.options.maxSamples) {
      this.timings = this.timings.slice(-this.options.maxSamples);
    }

    // Invalidate cache
    this.metricsCache = undefined;

    // Emit update
    this.emit('timing', timing);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    if (this.metricsCache) {
      return this.metricsCache;
    }

    const durations = this.timings
      .filter(t => t.success)
      .map(t => t.duration)
      .sort((a, b) => a - b);

    const queryTimings = this.timings
      .filter(t => t.operation.startsWith('query') && t.success);

    const metrics: PerformanceMetrics = {
      queryLatency: this.calculateStats(durations),
      throughput: this.calculateThroughput(),
      cache: this.calculateCacheMetrics(),
      storage: this.calculateStorageMetrics(),
      errors: this.calculateErrorMetrics()
    };

    this.metricsCache = metrics;

    // Cache expiry
    setTimeout(() => {
      this.metricsCache = undefined;
    }, this.cacheTimeout);

    return metrics;
  }

  /**
   * Calculate statistics
   */
  private calculateStats(durations: number[]): PerformanceMetrics['queryLatency'] {
    if (durations.length === 0) {
      return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const min = durations[0];
    const max = durations[durations.length - 1];
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    return { avg, min, max, p50, p95, p99 };
  }

  /**
   * Calculate throughput
   */
  private calculateThroughput(): PerformanceMetrics['throughput'] {
    const now = Date.now();
    const lastMinute = this.timings.filter(t => t.startTime > now - 60000);

    const operationsPerSecond = lastMinute.length / 60;
    const queriesPerSecond = lastMinute.filter(t => t.operation.startsWith('query')).length / 60;

    return { operationsPerSecond, queriesPerSecond };
  }

  /**
   * Calculate cache metrics (placeholder)
   */
  private calculateCacheMetrics(): PerformanceMetrics['cache'] {
    // In a real implementation, this would query the cache
    return {
      hitRate: 0.85,
      missRate: 0.15,
      size: 1000
    };
  }

  /**
   * Calculate storage metrics (placeholder)
   */
  private calculateStorageMetrics(): PerformanceMetrics['storage'] {
    // In a real implementation, this would query storage
    return {
      used: 50 * 1024 * 1024,
      total: 100 * 1024 * 1024,
      percentage: 0.5
    };
  }

  /**
   * Calculate error metrics
   */
  private calculateErrorMetrics(): PerformanceMetrics['errors'] {
    const total = this.timings.length;
    const errors = this.timings.filter(t => !t.success).length;

    return {
      count: errors,
      rate: total > 0 ? errors / total : 0
    };
  }

  /**
   * Get recent timings
   */
  getRecentTimings(limit: number = 100): OperationTiming[] {
    return this.timings.slice(-limit);
  }

  /**
   * Get timings by operation
   */
  getTimingsByOperation(operation: string): OperationTiming[] {
    return this.timings.filter(t => t.operation === operation);
  }

  /**
   * Clear all timings
   */
  clearTimings(): void {
    this.timings = [];
    this.metricsCache = undefined;
  }

  /**
   * Get timing count
   */
  getTimingCount(): number {
    return this.timings.length;
  }
}
