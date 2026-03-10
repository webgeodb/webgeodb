/**
 * Storage Manager
 * Handles storage quota management and cleanup
 */

import { EventEmitter } from 'events';

export interface StorageUsage {
  used: number;
  available: number;
  total: number;
  percentage: number;
}

export interface StorageQuota {
  quota: number;
  warningThreshold: number; // 0.0 - 1.0
  criticalThreshold: number; // 0.0 - 1.0
}

export interface CleanupOptions {
  olderThan?: number; // days
  keepLatest?: number;
  dryRun?: boolean;
}

export class StorageManager extends EventEmitter {
  private quota: StorageQuota;
  private usage: StorageUsage;

  constructor(options: Partial<StorageQuota> = {}) {
    super();
    this.quota = {
      quota: options.quota || 100 * 1024 * 1024, // 100MB default
      warningThreshold: options.warningThreshold || 0.8, // 80%
      criticalThreshold: options.criticalThreshold || 0.95, // 95%
    };
    this.usage = {
      used: 0,
      available: this.quota.quota,
      total: this.quota.quota,
      percentage: 0,
    };
  }

  /**
   * Get current storage usage
   */
  async getUsage(): Promise<StorageUsage> {
    // In a real implementation, this would query IndexedDB
    // For now, return simulated data
    return { ...this.usage };
  }

  /**
   * Update storage usage
   */
  async updateUsage(used: number): Promise<void> {
    this.usage.used = used;
    this.usage.available = this.quota.quota - used;
    this.usage.percentage = used / this.quota.quota;

    // Check thresholds
    if (this.usage.percentage >= this.quota.criticalThreshold) {
      this.emit('quota-critical', this.usage);
    } else if (this.usage.percentage >= this.quota.warningThreshold) {
      this.emit('quota-warning', this.usage);
    }

    if (this.usage.used >= this.quota.quota) {
      this.emit('quota-exceeded', this.usage);
    }
  }

  /**
   * Check if quota is exceeded
   */
  isQuotaExceeded(): boolean {
    return this.usage.used >= this.quota.quota;
  }

  /**
   * Check if quota warning should be shown
   */
  isQuotaWarning(): boolean {
    return this.usage.percentage >= this.quota.warningThreshold;
  }

  /**
   * Get quota information
   */
  getQuota(): StorageQuota {
    return { ...this.quota };
  }

  /**
   * Set quota
   */
  setQuota(quota: number): void {
    this.quota.quota = quota;
    this.usage.total = quota;
    this.usage.available = quota - this.usage.used;
  }

  /**
   * Set warning threshold
   */
  setWarningThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    this.quota.warningThreshold = threshold;
  }

  /**
   * Cleanup old data
   */
  async cleanupOldData(options: CleanupOptions = {}): Promise<number> {
    const {
      olderThan = 30,
      keepLatest = 100,
      dryRun = false,
    } = options;

    if (dryRun) {
      console.log('[DRY RUN] Would cleanup data older than', olderThan, 'days');
      return 0;
    }

    // In a real implementation, this would:
    // 1. Query old records
    // 2. Delete them
    // 3. Update usage

    const cleanedBytes = 0; // Placeholder
    this.emit('cleanup-completed', { cleanedBytes, olderThan });

    return cleanedBytes;
  }

  /**
   * Estimate size of data
   */
  async estimateSize(data: any): Promise<number> {
    // Rough estimate: JSON string length
    const json = JSON.stringify(data);
    return new Blob([json]).size;
  }

  /**
   * Get storage recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.usage.percentage > 0.9) {
      recommendations.push('Consider increasing storage quota');
      recommendations.push('Run cleanup to free up space');
    }

    if (this.usage.percentage > 0.95) {
      recommendations.push('URGENT: Storage nearly full');
      recommendations.push('Immediate cleanup required');
    }

    if (this.quota.quota < 50 * 1024 * 1024) {
      recommendations.push('Storage quota is small (< 50MB), consider increasing');
    }

    return recommendations;
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
 }

  /**
   * Get storage summary
   */
  async getSummary(): Promise<{
    usage: StorageUsage;
    quota: StorageQuota;
    formatted: {
      used: string;
      available: string;
      total: string;
    };
    status: 'ok' | 'warning' | 'critical';
    recommendations: string[];
  }> {
    const usage = await this.getUsage();

    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (usage.percentage >= this.quota.criticalThreshold) {
      status = 'critical';
    } else if (usage.percentage >= this.quota.warningThreshold) {
      status = 'warning';
    }

    return {
      usage,
      quota: this.getQuota(),
      formatted: {
        used: this.formatBytes(usage.used),
        available: this.formatBytes(usage.available),
        total: this.formatBytes(usage.total),
      },
      status,
      recommendations: this.getRecommendations(),
    };
  }
}
