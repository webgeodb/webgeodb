/**
 * Monitoring Dashboard
 * Aggregates and displays monitoring data
 */

import { EventEmitter } from 'events';
import { PerformanceMonitor, PerformanceMetrics } from '../performance/index.js';
import { ErrorMonitor, ErrorSummary } from '../errors/index.js';
import { StructuredLogger } from '../logging/index.js';

export interface DashboardData {
  metrics: PerformanceMetrics;
  errors: ErrorSummary;
  logs: {
    total: number;
    byLevel: Record<string, number>;
    recent: any[];
  };
  system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    timestamp: number;
  };
}

export interface DashboardUpdate extends DashboardData {
  updatedAt: number;
}

export class MonitoringDashboard extends EventEmitter {
  private performanceMonitor: PerformanceMonitor;
  private errorMonitor: ErrorMonitor;
  private logger: StructuredLogger;
  private startTime: number;
  private updateInterval?: NodeJS.Timeout;
  private updateFrequency: number = 5000; // 5 seconds

  constructor() {
    super();
    this.performanceMonitor = new PerformanceMonitor();
    this.errorMonitor = new ErrorMonitor();
    this.logger = new StructuredLogger();
    this.startTime = Date.now();
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.updateInterval) {
      return;
    }

    this.updateInterval = setInterval(async () => {
      await this.update();
    }, this.updateFrequency);

    // Initial update
    this.update();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  /**
   * Update dashboard data
   */
  private async update(): Promise<void> {
    const data = await this.getData();
    const update: DashboardUpdate = {
      ...data,
      updatedAt: Date.now()
    };

    this.emit('update', update);
  }

  /**
   * Get current dashboard data
   */
  async getData(): Promise<DashboardData> {
    const metrics = this.performanceMonitor.getMetrics();
    const errors = this.errorMonitor.getErrorSummary();
    const logs = this.logger.getEntries();

    return {
      metrics,
      errors,
      logs: {
        total: logs.length,
        byLevel: this.groupLogsByLevel(logs),
        recent: logs.slice(-10)
      },
      system: {
        uptime: Date.now() - this.startTime,
        memory: process.memoryUsage(),
        timestamp: Date.now()
      }
    };
  }

  /**
   * Group logs by level
   */
  private groupLogsByLevel(logs: any[]): Record<string, number> {
    const byLevel: Record<string, number> = {};
    for (const log of logs) {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    }
    return byLevel;
  }

  /**
   * Get performance monitor
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }

  /**
   * Get error monitor
   */
  getErrorMonitor(): ErrorMonitor {
    return this.errorMonitor;
  }

  /**
   * Get logger
   */
  getLogger(): StructuredLogger {
    return this.logger;
  }

  /**
   * Set update frequency
   */
  setUpdateFrequency(frequency: number): void {
    this.updateFrequency = frequency;
    if (this.updateInterval) {
      this.stop();
      this.start();
    }
  }

  /**
   * Generate report
   */
  async generateReport(): Promise<string> {
    const data = await this.getData();

    let report = '=== WebGeoDB Monitoring Report ===\n\n';

    report += 'Performance Metrics:\n';
    report += `  Query Latency (avg): ${data.metrics.queryLatency.avg}ms\n`;
    report += `  Throughput: ${data.metrics.throughput.operationsPerSecond.toFixed(2)} ops/sec\n`;
    report += `  Cache Hit Rate: ${(data.metrics.cache.hitRate * 100).toFixed(1)}%\n`;
    report += `  Storage Usage: ${(data.metrics.storage.percentage * 100).toFixed(1)}%\n\n`;

    report += 'Errors:\n';
    report += `  Total: ${data.errors.totalErrors}\n`;
    report += `  By Type: ${JSON.stringify(data.errors.errorsByType)}\n\n`;

    report += 'System:\n';
    report += `  Uptime: ${((data.system.uptime / 1000 / 60).toFixed(2))} minutes\n`;
    report += `  Memory: ${(data.system.memory.heapUsed / 1024 / 1024).toFixed(2)} MB\n`;

    return report;
  }
}
