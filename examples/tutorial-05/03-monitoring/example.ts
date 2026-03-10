/**
 * Monitoring Example Usage
 *
 * This example demonstrates how to use the monitoring features
 */

import { MonitoringDashboard } from './src/dashboard/index.js';
import { PerformanceMonitor } from './src/performance/index.js';
import { ErrorMonitor } from './src/errors/index.js';
import { StructuredLogger } from './src/logging/index.js';
import { AlertManager } from './src/alerts/index.js';

async function main() {
  console.log('=== WebGeoDB Monitoring Example ===\n');

  // 1. Performance monitoring
  console.log('1. Performance Monitoring:');
  const perfMonitor = new PerformanceMonitor({ enabled: true });

  // Simulate some operations
  await perfMonitor.trackOperation('query', async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return { results: [] };
  });

  await perfMonitor.trackOperation('insert', async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    return { id: '123' };
  });

  const metrics = perfMonitor.getMetrics();
  console.log(`   Query latency (avg): ${metrics.queryLatency.avg.toFixed(2)}ms`);
  console.log(`   Throughput: ${metrics.throughput.operationsPerSecond.toFixed(2)} ops/sec\n`);

  // 2. Error monitoring
  console.log('2. Error Monitoring:');
  const errorMonitor = new ErrorMonitor({ enabled: true });

  errorMonitor.captureError('Test error', {
    operation: 'query',
    userId: 'user-123'
  });

  const errorSummary = errorMonitor.getErrorSummary();
  console.log(`   Total errors: ${errorSummary.totalErrors}`);
  console.log(`   By type: ${JSON.stringify(errorSummary.errorsByType)}\n`);

  // 3. Structured logging
  console.log('3. Structured Logging:');
  const logger = new StructuredLogger({ level: 'info' });

  logger.info('Query executed', {
    queryType: 'near',
    resultCount: 10,
    duration: 45
  });

  logger.warn('High memory usage', {
    used: 80,
    total: 100
  });

  logger.error('Query failed', {
    error: 'Connection timeout',
    retries: 3
  });

  console.log(`   Total log entries: ${logger.getEntryCount()}\n`);

  // 4. Alert management
  console.log('4. Alert Management:');
  const alertManager = new AlertManager();

  const customRule = alertManager.createRule({
    name: 'Custom Latency Alert',
    description: 'Alert when latency exceeds 200ms',
    condition: (data) => data.metrics.queryLatency.avg > 200,
    severity: 'warning'
  });
  console.log(`   Created rule: ${customRule.name}`);

  // Simulate high latency
  await perfMonitor.trackOperation('slow-query', async () => {
    await new Promise(resolve => setTimeout(resolve, 250));
    return {};
  });

  const updatedMetrics = perfMonitor.getMetrics();
  const alerts = alertManager.evaluateRules({
    metrics: updatedMetrics,
    errors: errorSummary
  });
  console.log(`   Alerts triggered: ${alerts.length}\n`);

  // 5. Monitoring dashboard
  console.log('5. Monitoring Dashboard:');
  const dashboard = new MonitoringDashboard();

  dashboard.start();
  console.log('   Dashboard monitoring started');

  // Subscribe to updates
  dashboard.on('update', (data) => {
    console.log(`   Dashboard updated: ${data.updatedAt}`);
  });

  // Wait for a few updates
  await new Promise(resolve => setTimeout(resolve, 2000));

  dashboard.stop();
  console.log('   Dashboard monitoring stopped\n');

  // 6. Generate report
  console.log('6. Monitoring Report:');
  const report = await dashboard.generateReport();
  console.log(report);

  console.log('=== Monitoring example completed successfully ===');
}

// Run the example
main().catch(console.error);
