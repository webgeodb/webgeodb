/**
 * WebGeoDB Performance Monitoring Example
 *
 * This example demonstrates comprehensive performance monitoring for WebGeoDB including:
 * - Performance metrics collection
 * - Error monitoring and tracking
 * - Structured logging
 * - Real-time monitoring dashboard
 * - Alerting system
 * - Performance analysis tools
 */

export { PerformanceMonitor } from './performance/index.js';
export { ErrorMonitor } from './errors/index.js';
export { StructuredLogger } from './logging/index.js';
export { MonitoringDashboard } from './dashboard/index.js';
export { AlertManager } from './alerts/index.js';
export { MetricsCollector } from './metrics/index.js';

// Type exports
export type {
  PerformanceMetrics,
  OperationTiming,
  PerformanceOptions
} from './performance/index.js';

export type {
  ErrorInfo,
  ErrorSummary,
  ErrorMonitorOptions
} from './errors/index.js';

export type {
  LogEntry,
  LogOptions,
  LogLevel
} from './logging/index.js';

export type {
  DashboardData,
  DashboardUpdate
} from './dashboard/index.js';

export type {
  AlertRule,
  AlertCondition,
  AlertSeverity
} from './alerts/index.js';

export type {
  MetricData,
  MetricType,
  MetricValue
} from './metrics/index.js';
