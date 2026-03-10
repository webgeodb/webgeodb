/**
 * Production Environment Checklist
 * Validates production readiness
 */

import { ProductionConfig } from '../config/index.js';
import { StorageManager } from '../storage/index.js';
import { VersionManager } from '../version/index.js';

export interface ChecklistItem {
  name: string;
  category: string;
  description: string;
  check: () => Promise<boolean>;
  required: boolean;
}

export interface ChecklistResult {
  name: string;
  category: string;
  status: 'passed' | 'failed' | 'skipped';
  required: boolean;
  errors: string[];
  warnings: string[];
}

export class ProductionChecklist {
  private config: ProductionConfig;
  private items: ChecklistItem[] = [];

  constructor(config: ProductionConfig) {
    this.config = config;
    this.registerDefaultChecks();
  }

  /**
   * Register checklist item
   */
  register(item: ChecklistItem): void {
    this.items.push(item);
  }

  /**
   * Register default checks
   */
  private registerDefaultChecks(): void {
    // Configuration checks
    this.register({
      name: 'Configuration Validated',
      category: 'Configuration',
      description: 'Configuration must be valid and pass all validations',
      check: async () => this.config.validate(),
      required: true,
    });

    this.register({
      name: 'Environment Variables Set',
      category: 'Configuration',
      description: 'All required environment variables must be set',
      check: async () => {
        const envManager = (this.config as any).envManager;
        const validation = envManager.validate();
        return validation.isValid;
      },
      required: true,
    });

    // Security checks
    this.register({
      name: 'Encryption Enabled',
      category: 'Security',
      description: 'Encryption should be enabled in production',
      check: async () => {
        const securityConfig = this.config.getSecurityConfig();
        return securityConfig.enableEncryption;
      },
      required: false,
    });

    this.register({
      name: 'Encryption Key Configured',
      category: 'Security',
      description: 'Encryption key must be set if encryption is enabled',
      check: async () => {
        const securityConfig = this.config.getSecurityConfig();
        if (!securityConfig.enableEncryption) {
          return true;
        }
        return !!securityConfig.encryptionKey && securityConfig.encryptionKey.length >= 32;
      },
      required: true,
    });

    this.register({
      name: 'Rate Limiting Enabled',
      category: 'Security',
      description: 'Rate limiting should be enabled in production',
      check: async () => {
        const securityConfig = this.config.getSecurityConfig();
        return securityConfig.rateLimit.enabled;
      },
      required: false,
    });

    // Storage checks
    this.register({
      name: 'Storage Quota Configured',
      category: 'Storage',
      description: 'Storage quota must be configured',
      check: async () => {
        const dbConfig = this.config.getDatabaseConfig();
        return dbConfig.storageQuota > 0;
      },
      required: true,
    });

    this.register({
      name: 'Backup Path Configured',
      category: 'Storage',
      description: 'Backup path should be configured',
      check: async () => {
        const dbConfig = this.config.getDatabaseConfig();
        return !!dbConfig.backupPath;
      },
      required: false,
    });

    this.register({
      name: 'Auto Cleanup Enabled',
      category: 'Storage',
      description: 'Auto cleanup should be enabled',
      check: async () => {
        const dbConfig = this.config.getDatabaseConfig();
        return dbConfig.autoCleanup;
      },
      required: false,
    });

    // Performance checks
    this.register({
      name: 'Compression Enabled',
      category: 'Performance',
      description: 'Compression should be enabled for better performance',
      check: async () => {
        const dbConfig = this.config.getDatabaseConfig();
        return dbConfig.enableCompression;
      },
      required: false,
    });

    this.register({
      name: 'Cache Configured',
      category: 'Performance',
      description: 'Cache should be configured',
      check: async () => {
        const cacheConfig = this.config.getCacheConfig();
        return cacheConfig.enabled && cacheConfig.maxSize > 0;
      },
      required: false,
    });

    this.register({
      name: 'Query Optimization Enabled',
      category: 'Performance',
      description: 'Query optimization should be enabled',
      check: async () => {
        const perfConfig = this.config.getPerformanceConfig();
        return perfConfig.enableQueryOptimization;
      },
      required: false,
    });

    // Monitoring checks
    this.register({
      name: 'Monitoring Enabled',
      category: 'Monitoring',
      description: 'Monitoring should be enabled in production',
      check: async () => {
        const monitoringConfig = this.config.getMonitoringConfig();
        return monitoringConfig.enabled;
      },
      required: false,
    });

    this.register({
      name: 'Logging Enabled',
      category: 'Monitoring',
      description: 'Logging should be enabled',
      check: async () => {
        const monitoringConfig = this.config.getMonitoringConfig();
        return monitoringConfig.loggingEnabled;
      },
      required: false,
    });

    this.register({
      name: 'Alerting Configured',
      category: 'Monitoring',
      description: 'Alerting should be configured for production',
      check: async () => {
        const monitoringConfig = this.config.getMonitoringConfig();
        return monitoringConfig.alertingEnabled;
      },
      required: false,
    });
  }

  /**
   * Run all checks
   */
  async runAll(): Promise<ChecklistResult[]> {
    const results: ChecklistResult[] = [];

    for (const item of this.items) {
      const result = await this.runCheck(item);
      results.push(result);
    }

    return results;
  }

  /**
   * Run single check
   */
  async runCheck(item: ChecklistItem): Promise<ChecklistResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const passed = await item.check();

      return {
        name: item.name,
        category: item.category,
        status: passed ? 'passed' : 'failed',
        required: item.required,
        errors: passed ? [] : [item.description],
        warnings,
      };
    } catch (error) {
      return {
        name: item.name,
        category: item.category,
        status: 'failed',
        required: item.required,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings,
      };
    }
  }

  /**
   * Run checks by category
   */
  async runCategory(category: string): Promise<ChecklistResult[]> {
    const items = this.items.filter(item => item.category === category);
    const results: ChecklistResult[] = [];

    for (const item of items) {
      const result = await this.runCheck(item);
      results.push(result);
    }

    return results;
  }

  /**
   * Get all items
   */
  getItems(): ChecklistItem[] {
    return [...this.items];
  }

  /**
   * Get categories
   */
  getCategories(): string[] {
    const categories = new Set(this.items.map(item => item.category));
    return Array.from(categories);
  }

  /**
   * Generate report
   */
  async generateReport(): Promise<string> {
    const results = await this.runAll();
    const categories = this.getCategories();

    let report = 'Production Readiness Report\n';
    report += '='.repeat(60) + '\n\n';

    // Summary
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const requiredFailed = results.filter(r => r.status === 'failed' && r.required).length;

    report += `Summary: ${passed} passed, ${failed} failed (${requiredFailed} required)\n\n`;

    // Results by category
    for (const category of categories) {
      const categoryResults = results.filter(r => r.category === category);
      report += `\n${category}\n`;
      report += '-'.repeat(60) + '\n';

      for (const result of categoryResults) {
        const status = result.status === 'passed' ? '✓' : '✗';
        const required = result.required ? '(Required)' : '(Optional)';
        report += `${status} ${result.name} ${required}\n`;

        if (result.errors.length > 0) {
          result.errors.forEach(error => {
            report += `  ERROR: ${error}\n`;
          });
        }

        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => {
            report += `  WARNING: ${warning}\n`;
          });
        }
      }
    }

    // Overall status
    report += '\n' + '='.repeat(60) + '\n';
    if (requiredFailed > 0) {
      report += 'Status: NOT READY (Required checks failed)\n';
    } else if (failed > 0) {
      report += 'Status: READY WITH WARNINGS (Optional checks failed)\n';
    } else {
      report += 'Status: READY FOR PRODUCTION\n';
    }

    return report;
  }
}
