/**
 * Storage Monitor
 * Monitors storage usage and sends alerts
 */

import { EventEmitter } from 'events';
import { StorageManager } from './index.js';

export interface MonitorOptions {
  checkInterval?: number; // milliseconds
  alertThresholds?: {
    warning: number;
    critical: number;
  };
}

export class StorageMonitor extends EventEmitter {
  private storageManager: StorageManager;
  private interval?: NodeJS.Timeout;
  private options: Required<MonitorOptions>;

  constructor(
    storageManager: StorageManager,
    options: MonitorOptions = {}
  ) {
    super();
    this.storageManager = storageManager;
    this.options = {
      checkInterval: options.checkInterval || 60000, // 1 minute
      alertThresholds: options.alertThresholds || {
        warning: 0.8,
        critical: 0.95,
      },
    };
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(async () => {
      await this.check();
    }, this.options.checkInterval);

    // Initial check
    this.check();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  /**
   * Check storage usage
   */
  async check(): Promise<void> {
    const usage = await this.storageManager.getUsage();

    if (usage.percentage >= this.options.alertThresholds.critical) {
      this.emit('critical', usage);
    } else if (usage.percentage >= this.options.alertThresholds.warning) {
      this.emit('warning', usage);
    } else {
      this.emit('ok', usage);
    }
  }

  /**
   * Get current status
   */
  async getStatus(): Promise<{
    status: 'ok' | 'warning' | 'critical';
    usage: any;
  }> {
    const usage = await this.storageManager.getUsage();

    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (usage.percentage >= this.options.alertThresholds.critical) {
      status = 'critical';
    } else if (usage.percentage >= this.options.alertThresholds.warning) {
      status = 'warning';
    }

    return { status, usage };
  }
}
