/**
 * Monitoring Example Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceMonitor } from '../src/performance/index.js';
import { ErrorMonitor } from '../src/errors/index.js';
import { StructuredLogger } from '../src/logging/index.js';
import { AlertManager } from '../src/alerts/index.js';

describe('Monitoring Examples', () => {
  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor({ enabled: true });
    });

    it('should track operations', async () => {
      const result = await monitor.trackOperation('test', async () => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(monitor.getTimingCount()).toBe(1);
    });

    it('should calculate metrics', async () => {
      await monitor.trackOperation('query', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const metrics = monitor.getMetrics();
      expect(metrics.queryLatency.avg).toBeGreaterThan(0);
    });
  });

  describe('ErrorMonitor', () => {
    let errorMonitor: ErrorMonitor;

    beforeEach(() => {
      errorMonitor = new ErrorMonitor({ enabled: true });
    });

    it('should capture errors', () => {
      errorMonitor.captureError('Test error', { operation: 'test' });
      expect(errorMonitor.getErrorCount()).toBe(1);
    });

    it('should generate error summary', () => {
      errorMonitor.captureError('Error 1');
      errorMonitor.captureError('Error 2');

      const summary = errorMonitor.getErrorSummary();
      expect(summary.totalErrors).toBe(2);
    });
  });

  describe('StructuredLogger', () => {
    let logger: StructuredLogger;

    beforeEach(() => {
      logger = new StructuredLogger({ level: 'debug' });
    });

    it('should log messages', () => {
      logger.info('Test message');
      expect(logger.getEntryCount()).toBe(1);
    });

    it('should filter by log level', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.error('Error message');

      const errorEntries = logger.getEntriesByLevel('error');
      expect(errorEntries.length).toBe(1);
    });
  });

  describe('AlertManager', () => {
    let alertManager: AlertManager;

    beforeEach(() => {
      alertManager = new AlertManager();
    });

    it('should create rules', () => {
      const rule = alertManager.createRule({
        name: 'Test Rule',
        description: 'Test alert rule',
        condition: () => true,
        severity: 'warning'
      });

      expect(rule.name).toBe('Test Rule');
      expect(alertManager.getAllRules().length).toBeGreaterThan(0);
    });

    it('should evaluate rules', () => {
      alertManager.createRule({
        name: 'High Latency',
        description: 'Query latency too high',
        condition: (data) => data.metrics.queryLatency.avg > 100,
        severity: 'warning'
      });

      const alerts = alertManager.evaluateRules({
        metrics: {
          queryLatency: { avg: 150, min: 100, max: 200, p50: 150, p95: 180, p99: 190 },
          throughput: { operationsPerSecond: 10, queriesPerSecond: 5 },
          cache: { hitRate: 0.8, missRate: 0.2, size: 100 },
          storage: { used: 50, total: 100, percentage: 0.5 },
          errors: { count: 0, rate: 0 }
        },
        errors: {
          totalErrors: 0,
          errorsByType: {},
          errorsBySeverity: {},
          recentErrors: [],
          topErrors: []
        }
      });

      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});
