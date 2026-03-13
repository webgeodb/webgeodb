/**
 * 性能监控器
 * 跟踪查询性能、统计指标和慢查询日志
 */

import type { QueryLog, PerformanceStats, ProfilingState } from './types';

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  private queries: QueryLog[] = [];
  private stats: PerformanceStats;
  private profiling: ProfilingState;
  private queryIdCounter = 0;

  constructor() {
    this.stats = {
      queryCount: 0,
      avgQueryTime: 0,
      maxQueryTime: 0,
      minQueryTime: Infinity,
      totalQueryTime: 0,
      indexHitRate: 0,
      indexHits: 0,
      cacheHitRate: 0,
      cacheHits: 0,
      memoryUsage: 0,
      slowQueries: []
    };

    this.profiling = {
      enabled: false,
      slowQueryThreshold: 100, // 100ms
      maxLogEntries: 1000
    };
  }

  /**
   * 记录查询执行
   */
  recordQuery(
    type: string,
    query: string,
    duration: number,
    options: {
      rowCount?: number;
      usedIndex?: boolean;
      fromCache?: boolean;
      memoryUsage?: number;
    } = {}
  ): void {
    // 如果未启用性能分析，只更新基本统计
    if (!this.profiling.enabled) {
      this.updateBasicStats(duration, options.usedIndex || false, options.fromCache || false);
      return;
    }

    // 记录详细查询日志
    const log: QueryLog = {
      id: `query_${++this.queryIdCounter}`,
      type,
      query,
      duration,
      timestamp: Date.now(),
      rowCount: options.rowCount,
      usedIndex: options.usedIndex || false,
      fromCache: options.fromCache || false,
      memoryUsage: options.memoryUsage
    };

    // 添加到日志列表
    this.queries.push(log);

    // 限制日志大小
    if (this.queries.length > this.profiling.maxLogEntries) {
      this.queries.shift();
    }

    // 更新统计信息
    this.updateStats(log);

    // 检查是否为慢查询
    if (log.duration >= this.profiling.slowQueryThreshold) {
      this.stats.slowQueries.push(log);
      // 限制慢查询日志大小
      if (this.stats.slowQueries.length > 100) {
        this.stats.slowQueries.shift();
      }
    }
  }

  /**
   * 更新基本统计信息（无需详细日志）
   */
  private updateBasicStats(duration: number, usedIndex: boolean, fromCache: boolean): void {
    this.stats.queryCount++;
    this.stats.totalQueryTime += duration;

    // 更新平均时间
    this.stats.avgQueryTime = this.stats.totalQueryTime / this.stats.queryCount;

    // 更新最大/最小时间
    if (duration > this.stats.maxQueryTime) {
      this.stats.maxQueryTime = duration;
    }
    if (duration < this.stats.minQueryTime) {
      this.stats.minQueryTime = duration;
    }

    // 更新索引统计
    if (usedIndex) {
      this.stats.indexHits++;
    }
    this.stats.indexHitRate = this.stats.indexHits / this.stats.queryCount;

    // 更新缓存统计
    if (fromCache) {
      this.stats.cacheHits++;
    }
    this.stats.cacheHitRate = this.stats.cacheHits / this.stats.queryCount;

    // 更新内存使用
    this.stats.memoryUsage = this.getCurrentMemoryUsage();
  }

  /**
   * 更新统计信息
   */
  private updateStats(log: QueryLog): void {
    this.stats.queryCount++;
    this.stats.totalQueryTime += log.duration;

    // 更新平均时间
    this.stats.avgQueryTime = this.stats.totalQueryTime / this.stats.queryCount;

    // 更新最大/最小时间
    if (log.duration > this.stats.maxQueryTime) {
      this.stats.maxQueryTime = log.duration;
    }
    if (log.duration < this.stats.minQueryTime) {
      this.stats.minQueryTime = log.duration;
    }

    // 更新索引统计
    if (log.usedIndex) {
      this.stats.indexHits++;
    }
    this.stats.indexHitRate = this.stats.indexHits / this.stats.queryCount;

    // 更新缓存统计
    if (log.fromCache) {
      this.stats.cacheHits++;
    }
    this.stats.cacheHitRate = this.stats.cacheHits / this.stats.queryCount;

    // 更新内存使用
    this.stats.memoryUsage = log.memoryUsage || this.getCurrentMemoryUsage();
  }

  /**
   * 获取当前内存使用情况
   */
  private getCurrentMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  /**
   * 获取性能统计
   */
  getStats(): PerformanceStats {
    return { ...this.stats };
  }

  /**
   * 获取慢查询日志
   */
  getSlowQueries(threshold?: number): QueryLog[] {
    if (threshold !== undefined) {
      return this.queries.filter(log => log.duration >= threshold);
    }
    return [...this.stats.slowQueries];
  }

  /**
   * 获取所有查询日志
   */
  getAllQueries(): QueryLog[] {
    return [...this.queries];
  }

  /**
   * 启用/禁用性能分析
   */
  enableProfiling(enabled: boolean): void {
    this.profiling.enabled = enabled;

    // 如果禁用，清空日志但保留统计信息
    if (!enabled) {
      this.queries = [];
    }
  }

  /**
   * 设置慢查询阈值
   */
  setSlowQueryThreshold(threshold: number): void {
    this.profiling.slowQueryThreshold = threshold;
  }

  /**
   * 获取性能分析状态
   */
  getProfilingState(): ProfilingState {
    return { ...this.profiling };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.queries = [];
    this.stats = {
      queryCount: 0,
      avgQueryTime: 0,
      maxQueryTime: 0,
      minQueryTime: Infinity,
      totalQueryTime: 0,
      indexHitRate: 0,
      indexHits: 0,
      cacheHitRate: 0,
      cacheHits: 0,
      memoryUsage: 0,
      slowQueries: []
    };
    this.queryIdCounter = 0;
  }

  /**
   * 获取性能报告
   */
  getReport(): string {
    const stats = this.stats;
    const report = [
      '=== WebGeoDB 性能报告 ===',
      `总查询次数: ${stats.queryCount}`,
      `平均查询时间: ${stats.avgQueryTime.toFixed(2)}ms`,
      `最快查询: ${stats.minQueryTime === Infinity ? 0 : stats.minQueryTime.toFixed(2)}ms`,
      `最慢查询: ${stats.maxQueryTime.toFixed(2)}ms`,
      `索引命中率: ${(stats.indexHitRate * 100).toFixed(1)}%`,
      `缓存命中率: ${(stats.cacheHitRate * 100).toFixed(1)}%`,
      `内存使用: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
      `慢查询数量: ${stats.slowQueries.length}`
    ];

    return report.join('\n');
  }
}
