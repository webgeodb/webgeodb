/**
 * Storage Cleanup Handler
 * Handles cleanup strategies and schedules
 */

import { StorageManager } from './index.js';

export interface CleanupStrategy {
  name: string;
  description: string;
  execute: () => Promise<number>; // Returns bytes freed
}

export interface CleanupSchedule {
  interval: number; // milliseconds
  strategy: string;
  enabled: boolean;
}

export class CleanupHandler {
  private storageManager: StorageManager;
  private strategies: Map<string, CleanupStrategy> = new Map();
  private schedules: Map<string, CleanupSchedule> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
    this.registerDefaultStrategies();
  }

  /**
   * Register cleanup strategy
   */
  registerStrategy(strategy: CleanupStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Register default strategies
   */
  private registerDefaultStrategies(): void {
    // Old data cleanup
    this.registerStrategy({
      name: 'old-data',
      description: 'Remove data older than specified days',
      execute: async () => {
        return this.storageManager.cleanupOldData({ olderThan: 30 });
      },
    });

    // Excess data cleanup
    this.registerStrategy({
      name: 'excess-data',
      description: 'Keep only latest N records',
      execute: async () => {
        return this.storageManager.cleanupOldData({ keepLatest: 1000 });
      },
    });

    // Temporary data cleanup
    this.registerStrategy({
      name: 'temp-data',
      description: 'Remove temporary data',
      execute: async () => {
        return this.storageManager.cleanupOldData({ olderThan: 7 });
      },
    });

    // Aggressive cleanup
    this.registerStrategy({
      name: 'aggressive',
      description: 'Remove most data except recent',
      execute: async () => {
        return this.storageManager.cleanupOldData({ olderThan: 7, keepLatest: 100 });
      },
    });
  }

  /**
   * Get all strategies
   */
  getStrategies(): CleanupStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Run specific strategy
   */
  async runStrategy(name: string): Promise<number> {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Unknown strategy: ${name}`);
    }

    return strategy.execute();
  }

  /**
   * Schedule cleanup
   */
  schedule(name: string, schedule: CleanupSchedule): void {
    this.schedules.set(name, schedule);

    if (schedule.enabled) {
      this.startSchedule(name);
    }
  }

  /**
   * Start scheduled cleanup
   */
  private startSchedule(name: string): void {
    const schedule = this.schedules.get(name);
    if (!schedule || !schedule.enabled) {
      return;
    }

    // Clear existing timer
    this.stopSchedule(name);

    // Create new timer
    const timer = setInterval(async () => {
      await this.runStrategy(schedule.strategy);
    }, schedule.interval);

    this.timers.set(name, timer);
  }

  /**
   * Stop scheduled cleanup
   */
  stopSchedule(name: string): void {
    const timer = this.timers.get(name);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(name);
    }
  }

  /**
   * Stop all schedules
   */
  stopAllSchedules(): void {
    this.timers.forEach((_, name) => {
      this.stopSchedule(name);
    });
  }

  /**
   * Get all schedules
   */
  getSchedules(): CleanupSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Create recommended schedules
   */
  createRecommendedSchedules(): void {
    // Daily old data cleanup
    this.schedule('daily-cleanup', {
      interval: 86400000, // 24 hours
      strategy: 'old-data',
      enabled: true,
    });

    // Hourly temp data cleanup
    this.schedule('hourly-temp-cleanup', {
      interval: 3600000, // 1 hour
      strategy: 'temp-data',
      enabled: true,
    });
  }
}
