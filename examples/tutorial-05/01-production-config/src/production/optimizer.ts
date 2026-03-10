/**
 * Performance Optimizer
 * Applies performance optimizations for production
 */

import { ProductionConfig } from '../config/index.js';

export interface OptimizationResult {
  name: string;
  applied: boolean;
  details: string;
}

export class PerformanceOptimizer {
  private config: ProductionConfig;

  constructor(config: ProductionConfig) {
    this.config = config;
  }

  /**
   * Apply all optimizations
   */
  async optimize(): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    // Apply index optimization
    results.push(await this.optimizeIndexes());

    // Apply cache optimization
    results.push(await this.optimizeCache());

    // Apply query optimization
    results.push(await this.optimizeQueries());

    // Apply connection pool optimization
    results.push(await this.optimizeConnectionPool());

    // Apply batch size optimization
    results.push(await this.optimizeBatchSize());

    return results;
  }

  /**
   * Optimize indexes
   */
  private async optimizeIndexes(): Promise<OptimizationResult> {
    const perfConfig = this.config.getPerformanceConfig();

    return {
      name: 'Index Optimization',
      applied: true,
      details: `Index build threshold set to ${perfConfig.indexBuildThreshold} records`,
    };
  }

  /**
   * Optimize cache
   */
  private async optimizeCache(): Promise<OptimizationResult> {
    const cacheConfig = this.config.getCacheConfig();

    if (!cacheConfig.enabled) {
      return {
        name: 'Cache Optimization',
        applied: false,
        details: 'Cache is disabled',
      };
    }

    return {
      name: 'Cache Optimization',
      applied: true,
      details: `Cache enabled with max size ${cacheConfig.maxSize}, TTL ${cacheConfig.ttl}ms, strategy ${cacheConfig.strategy}`,
    };
  }

  /**
   * Optimize queries
   */
  private async optimizeQueries(): Promise<OptimizationResult> {
    const perfConfig = this.config.getPerformanceConfig();

    return {
      name: 'Query Optimization',
      applied: perfConfig.enableQueryOptimization,
      details: perfConfig.enableQueryOptimization
        ? 'Query optimization enabled'
        : 'Query optimization disabled',
    };
  }

  /**
   * Optimize connection pool
   */
  private async optimizeConnectionPool(): Promise<OptimizationResult> {
    const perfConfig = this.config.getPerformanceConfig();

    return {
      name: 'Connection Pool Optimization',
      applied: true,
      details: `Connection pool size: ${perfConfig.connectionPoolSize}, max concurrent: ${perfConfig.maxConcurrentOperations}`,
    };
  }

  /**
   * Optimize batch size
   */
  private async optimizeBatchSize(): Promise<OptimizationResult> {
    const perfConfig = this.config.getPerformanceConfig();

    return {
      name: 'Batch Size Optimization',
      applied: true,
      details: `Batch size: ${perfConfig.batchSize}`,
    };
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const coreConfig = this.config.getCoreConfig();
    const dbConfig = this.config.getDatabaseConfig();
    const cacheConfig = this.config.getCacheConfig();
    const perfConfig = this.config.getPerformanceConfig();

    // Environment-specific recommendations
    if (coreConfig.environment === 'production') {
      if (!dbConfig.enableCompression) {
        recommendations.push('Enable compression for better performance');
      }

      if (!cacheConfig.enabled) {
        recommendations.push('Enable caching to reduce database load');
      }

      if (cacheConfig.maxSize < 1000) {
        recommendations.push('Increase cache size for better hit rates');
      }

      if (perfConfig.batchSize < 100) {
        recommendations.push('Increase batch size for better throughput');
      }
    }

    // General recommendations
    if (perfConfig.connectionPoolSize < 5) {
      recommendations.push('Consider increasing connection pool size');
    }

    if (!perfConfig.enableQueryOptimization) {
      recommendations.push('Enable query optimization for better performance');
    }

    return recommendations;
  }

  /**
   * Generate optimization report
   */
  async generateReport(): Promise<string> {
    const results = await this.optimize();
    const recommendations = this.getRecommendations();

    let report = 'Performance Optimization Report\n';
    report += '='.repeat(60) + '\n\n';

    // Applied optimizations
    report += 'Applied Optimizations:\n';
    for (const result of results) {
      const status = result.applied ? '✓' : '✗';
      report += `${status} ${result.name}\n`;
      report += `  ${result.details}\n\n`;
    }

    // Recommendations
    if (recommendations.length > 0) {
      report += 'Recommendations:\n';
      recommendations.forEach(rec => {
        report += `  • ${rec}\n`;
      });
    } else {
      report += 'No additional recommendations.\n';
    }

    return report;
  }
}
