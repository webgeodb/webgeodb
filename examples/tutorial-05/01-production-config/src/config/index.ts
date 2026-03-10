/**
 * Production Configuration Manager
 * Main configuration management class
 */

import type {
  ProductionConfigInput,
  CoreConfig,
  DatabaseConfig,
  CacheConfig,
  SecurityConfig,
  PerformanceConfig,
  MonitoringConfig,
} from './schema.js';
import { ConfigValidator } from './validator.js';
import { getDefaultsForEnvironment } from './defaults.js';
import { EnvManager } from '../env/index.js';
import { VersionManager } from '../version/index.js';
import { StorageManager } from '../storage/index.js';

export interface ProductionConfigOptions {
  environment?: 'development' | 'staging' | 'production';
  version?: string;
  databaseName?: string;
  storageQuota?: number;
  indexPath?: string;
  backupPath?: string;
  enableCompression?: boolean;
  enableEncryption?: boolean;
  encryptionKey?: string;
  cacheSize?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  debug?: boolean;
  autoCleanup?: boolean;
  enableMonitoring?: boolean;
}

export class ProductionConfig {
  private config: ProductionConfigInput;
  private envManager: EnvManager;
  private versionManager?: VersionManager;
  private storageManager?: StorageManager;
  private initialized = false;

  constructor(options: ProductionConfigOptions = {}) {
    // Load environment variables
    this.envManager = new EnvManager();
    const env = this.envManager.load();

    // Merge options with environment variables and defaults
    const environment = options.environment || env.environment || 'development';
    const defaults = getDefaultsForEnvironment(environment);

    this.config = {
      core: {
        environment,
        version: options.version || env.version || defaults.core?.version || '1.0.0',
        logLevel: options.logLevel || env.logLevel || defaults.core?.logLevel || 'info',
        debug: options.debug ?? env.debug ?? defaults.core?.debug ?? false,
      },
      database: {
        name: options.databaseName || env.databaseName || 'webgeodb',
        version: 1,
        storageQuota: options.storageQuota || env.storageQuota || defaults.database?.storageQuota || 100 * 1024 * 1024,
        indexPath: options.indexPath || env.indexPath || '/data/webgeodb',
        backupPath: options.backupPath || env.backupPath,
        enableCompression: options.enableCompression ?? env.enableCompression ?? defaults.database?.enableCompression ?? true,
        enableEncryption: options.enableEncryption ?? env.enableEncryption ?? defaults.database?.enableEncryption ?? false,
        autoCleanup: options.autoCleanup ?? env.autoCleanup ?? defaults.database?.autoCleanup ?? true,
        cleanupInterval: defaults.database?.cleanupInterval || 86400000,
      },
      cache: {
        enabled: true,
        maxSize: options.cacheSize || env.cacheSize || defaults.cache?.maxSize || 1000,
        ttl: defaults.cache?.ttl || 3600000,
        strategy: defaults.cache?.strategy || 'lru',
      },
      security: {
        enableEncryption: options.enableEncryption ?? env.enableEncryption ?? defaults.security?.enableEncryption ?? false,
        encryptionKey: options.encryptionKey || env.encryptionKey,
        enableValidation: defaults.security?.enableValidation ?? true,
        maxRetries: defaults.security?.maxRetries || 3,
        rateLimit: {
          enabled: defaults.security?.rateLimit?.enabled ?? true,
          maxRequests: defaults.security?.rateLimit?.maxRequests || 100,
          windowMs: defaults.security?.rateLimit?.windowMs || 60000,
        },
      },
      performance: {
        batchSize: defaults.performance?.batchSize || 100,
        maxConcurrentOperations: defaults.performance?.maxConcurrentOperations || 10,
        connectionPoolSize: defaults.performance?.connectionPoolSize || 5,
        indexBuildThreshold: defaults.performance?.indexBuildThreshold || 1000,
        enableQueryOptimization: defaults.performance?.enableQueryOptimization ?? true,
      },
      monitoring: {
        enabled: options.enableMonitoring ?? env.enableMonitoring ?? defaults.monitoring?.enabled ?? true,
        metricsEnabled: defaults.monitoring?.metricsEnabled ?? true,
        loggingEnabled: defaults.monitoring?.loggingEnabled ?? true,
        alertingEnabled: defaults.monitoring?.alertingEnabled ?? false,
        samplingRate: defaults.monitoring?.samplingRate || 1.0,
        reportingInterval: defaults.monitoring?.reportingInterval || 60000,
      },
    };
  }

  /**
   * Initialize configuration
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Validate configuration
    const validation = ConfigValidator.validate(this.config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${JSON.stringify(validation.errors, null, 2)}`);
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn('Configuration warnings:', validation.warnings);
    }

    // Initialize version manager
    this.versionManager = new VersionManager({
      currentVersion: this.config.core.version,
    });

    // Initialize storage manager
    this.storageManager = new StorageManager({
      quota: this.config.database.storageQuota,
      warningThreshold: 0.8,
    });

    this.initialized = true;
  }

  /**
   * Validate configuration
   */
  async validate(): Promise<boolean> {
    const validation = ConfigValidator.validate(this.config);
    return validation.isValid;
  }

  /**
   * Get core configuration
   */
  getCoreConfig(): CoreConfig {
    return this.config.core;
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig(): DatabaseConfig {
    return this.config.database;
  }

  /**
   * Get cache configuration
   */
  getCacheConfig(): CacheConfig {
    return this.config.cache;
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return this.config.security;
  }

  /**
   * Get performance configuration
   */
  getPerformanceConfig(): PerformanceConfig {
    return this.config.performance;
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig(): MonitoringConfig {
    return this.config.monitoring;
  }

  /**
   * Get complete configuration
   */
  getConfig(): ProductionConfigInput {
    return this.config;
  }

  /**
   * Get version manager
   */
  getVersionManager(): VersionManager {
    if (!this.versionManager) {
      throw new Error('Configuration not initialized');
    }
    return this.versionManager;
  }

  /**
   * Get storage manager
   */
  getStorageManager(): StorageManager {
    if (!this.storageManager) {
      throw new Error('Configuration not initialized');
    }
    return this.storageManager;
  }

  /**
   * Export configuration (for debugging/logging)
   */
  export(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Clone configuration
   */
  clone(): ProductionConfig {
    const cloned = new ProductionConfig();
    cloned.config = JSON.parse(JSON.stringify(this.config));
    cloned.initialized = this.initialized;
    return cloned;
  }
}
