/**
 * Alert Manager
 * Manages alert rules and notifications
 */

import { EventEmitter } from 'events';
import { PerformanceMetrics } from '../performance/index.js';
import { ErrorSummary } from '../errors/index.js';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (data: { metrics: PerformanceMetrics; errors: ErrorSummary }) => boolean;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMs?: number;
  lastTriggered?: number;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  data: {
    metrics: PerformanceMetrics;
    errors: ErrorSummary;
  };
}

export class AlertManager extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Alert[] = [];
  private maxAlerts: number = 1000;

  constructor() {
    super();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // High query latency
    this.createRule({
      name: 'High Query Latency',
      description: 'Query latency exceeds threshold',
      condition: (data) => data.metrics.queryLatency.p95 > 1000,
      severity: 'warning'
    });

    // High error rate
    this.createRule({
      name: 'High Error Rate',
      description: 'Error rate exceeds 5%',
      condition: (data) => data.errors.errorsBySeverity.critical > 10 || data.metrics.errors.rate > 0.05,
      severity: 'critical'
    });

    // Low cache hit rate
    this.createRule({
      name: 'Low Cache Hit Rate',
      description: 'Cache hit rate below 70%',
      condition: (data) => data.metrics.cache.hitRate < 0.7,
      severity: 'warning'
    });

    // Storage space
    this.createRule({
      name: 'Storage Space Warning',
      description: 'Storage usage exceeds 80%',
      condition: (data) => data.metrics.storage.percentage > 0.8,
      severity: 'warning'
    });

    // Storage critical
    this.createRule({
      name: 'Storage Space Critical',
      description: 'Storage usage exceeds 95%',
      condition: (data) => data.metrics.storage.percentage > 0.95,
      severity: 'critical'
    });
  }

  /**
   * Create alert rule
   */
  createRule(rule: Omit<AlertRule, 'id' | 'enabled' | 'lastTriggered'>): AlertRule {
    const alertRule: AlertRule = {
      ...rule,
      id: this.generateRuleId(),
      enabled: true,
      lastTriggered: undefined,
      cooldownMs: rule.cooldownMs || 60000 // 1 minute default
    };

    this.rules.set(alertRule.id, alertRule);
    return alertRule;
  }

  /**
   * Evaluate all rules
   */
  evaluateRules(data: {
    metrics: PerformanceMetrics;
    errors: ErrorSummary;
  }): Alert[] {
    const triggeredAlerts: Alert[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const timeSinceLastTrigger = Date.now() - rule.lastTriggered;
        if (timeSinceLastTrigger < (rule.cooldownMs || 0)) {
          continue;
        }
      }

      // Evaluate condition
      try {
        if (rule.condition(data)) {
          const alert = this.triggerAlert(rule, data);
          triggeredAlerts.push(alert);
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${rule.name}:`, error);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Trigger alert
   */
  private triggerAlert(rule: AlertRule, data: {
    metrics: PerformanceMetrics;
    errors: ErrorSummary;
  }): Alert {
    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: rule.description,
      timestamp: Date.now(),
      data
    };

    this.alerts.push(alert);

    // Update last triggered
    rule.lastTriggered = alert.timestamp;

    // Trim old alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    // Emit alert
    this.emit('alert', alert);

    if (alert.severity === 'critical') {
      this.emit('critical-alert', alert);
    }

    return alert;
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Update rule
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    return true;
  }

  /**
   * Delete rule
   */
  deleteRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Enable/disable rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.enabled = enabled;
    return true;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): Alert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return this.alerts.filter(a => a.severity === severity);
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Generate unique rule ID
   */
  private generateRuleId(): string {
    return `rule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
