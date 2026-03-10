/**
 * Metrics Collector
 * Collects and aggregates custom metrics
 */

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface MetricData {
  name: string;
  type: MetricType;
  values: MetricValue[];
  description?: string;
}

export class MetricsCollector {
  private metrics: Map<string, MetricData> = new Map();
  private maxValues: number = 10000;

  /**
   * Register metric
   */
  registerMetric(name: string, type: MetricType, description?: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        type,
        values: [],
        description
      });
    }
  }

  /**
   * Increment counter
   */
  increment(name: string, value: number = 1, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') {
      throw new Error(`Counter metric not found: ${name}`);
    }

    const lastValue = metric.values[metric.values.length - 1];
    const newValue = lastValue ? lastValue.value + value : value;

    metric.values.push({
      value: newValue,
      timestamp: Date.now(),
      labels
    });

    this.trimMetric(metric);
  }

  /**
   * Set gauge value
   */
  set(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') {
      throw new Error(`Gauge metric not found: ${name}`);
    }

    metric.values.push({
      value,
      timestamp: Date.now(),
      labels
    });

    this.trimMetric(metric);
  }

  /**
   * Record histogram value
   */
  record(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') {
      throw new Error(`Histogram metric not found: ${name}`);
    }

    metric.values.push({
      value,
      timestamp: Date.now(),
      labels
    });

    this.trimMetric(metric);
  }

  /**
   * Get metric
   */
  getMetric(name: string): MetricData | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): MetricData[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metric value
   */
  getValue(name: string): number | undefined {
    const metric = this.metrics.get(name);
    if (!metric || metric.values.length === 0) {
      return undefined;
    }

    const latest = metric.values[metric.values.length - 1];
    return latest.value;
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | undefined {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram' || metric.values.length === 0) {
      return undefined;
    }

    const values = metric.values.map(v => v.value).sort((a, b) => a - b);
    const count = values.length;
    const min = values[0];
    const max = values[values.length - 1];
    const avg = values.reduce((sum, v) => sum + v, 0) / count;
    const p50 = values[Math.floor(count * 0.5)];
    const p95 = values[Math.floor(count * 0.95)];
    const p99 = values[Math.floor(count * 0.99)];

    return { count, min, max, avg, p50, p95, p99 };
  }

  /**
   * Reset metric
   */
  reset(name: string): void {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.values = [];
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Trim metric values
   */
  private trimMetric(metric: MetricData): void {
    if (metric.values.length > this.maxValues) {
      metric.values = metric.values.slice(-this.maxValues);
    }
  }

  /**
   * Export metrics as Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      // HELP line
      if (metric.description) {
        lines.push(`# HELP ${metric.name} ${metric.description}`);
      }

      // TYPE line
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      // Values
      for (const value of metric.values) {
        const labels = value.labels
          ? `{${Object.entries(value.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
          : '';
        lines.push(`${metric.name}${labels} ${value.value} ${value.timestamp}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}
