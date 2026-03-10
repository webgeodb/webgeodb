/**
 * Tests for Production Configuration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProductionConfig } from '../src/config/index.js';
import { ConfigValidator } from '../src/config/validator.js';
import { VersionManager } from '../src/version/index.js';
import { StorageManager } from '../src/storage/index.js';
import { EnvManager } from '../src/env/index.js';

describe('ProductionConfig', () => {
  let config: ProductionConfig;

  beforeEach(() => {
    config = new ProductionConfig({
      environment: 'production',
      version: '1.0.0',
      storageQuota: 100 * 1024 * 1024,
      indexPath: '/data/webgeodb',
      enableEncryption: true,
      encryptionKey: 'test-encryption-key-32-characters-long',
    });
  });

  describe('initialization', () => {
    it('should create configuration with defaults', async () => {
      await config.initialize();
      expect(config).toBeDefined();
    });

    it('should load configuration from options', async () => {
      await config.initialize();
      const coreConfig = config.getCoreConfig();
      expect(coreConfig.environment).toBe('production');
      expect(coreConfig.version).toBe('1.0.0');
    });
  });

  describe('validation', () => {
    it('should validate correct configuration', async () => {
      const isValid = await config.validate();
      expect(isValid).toBe(true);
    });

    it('should reject invalid version', async () => {
      const invalidConfig = new ProductionConfig({
        environment: 'production',
        version: 'invalid',
      });
      const isValid = await invalidConfig.validate();
      expect(isValid).toBe(false);
    });

    it('should require encryption key when encryption enabled', async () => {
      const invalidConfig = new ProductionConfig({
        environment: 'production',
        enableEncryption: true,
      });
      const isValid = await invalidConfig.validate();
      expect(isValid).toBe(false);
    });
  });

  describe('configuration getters', () => {
    beforeEach(async () => {
      await config.initialize();
    });

    it('should return core configuration', () => {
      const coreConfig = config.getCoreConfig();
      expect(coreConfig).toBeDefined();
      expect(coreConfig.environment).toBe('production');
    });

    it('should return database configuration', () => {
      const dbConfig = config.getDatabaseConfig();
      expect(dbConfig).toBeDefined();
      expect(dbConfig.storageQuota).toBe(100 * 1024 * 1024);
    });

    it('should return cache configuration', () => {
      const cacheConfig = config.getCacheConfig();
      expect(cacheConfig).toBeDefined();
    });

    it('should return security configuration', () => {
      const securityConfig = config.getSecurityConfig();
      expect(securityConfig).toBeDefined();
      expect(securityConfig.enableEncryption).toBe(true);
    });

    it('should return performance configuration', () => {
      const perfConfig = config.getPerformanceConfig();
      expect(perfConfig).toBeDefined();
    });

    it('should return monitoring configuration', () => {
      const monitoringConfig = config.getMonitoringConfig();
      expect(monitoringConfig).toBeDefined();
    });
  });
});

describe('ConfigValidator', () => {
  it('should validate valid configuration', () => {
    const validConfig = {
      core: {
        environment: 'production',
        version: '1.0.0',
        logLevel: 'info' as const,
        debug: false,
      },
      database: {
        name: 'test-db',
        version: 1,
        storageQuota: 100 * 1024 * 1024,
        indexPath: '/data/test',
        enableCompression: true,
        enableEncryption: false,
        autoCleanup: true,
        cleanupInterval: 86400000,
      },
      cache: {
        enabled: true,
        maxSize: 1000,
        ttl: 3600000,
        strategy: 'lru' as const,
      },
      security: {
        enableEncryption: false,
        enableValidation: true,
        maxRetries: 3,
        rateLimit: {
          enabled: true,
          maxRequests: 100,
          windowMs: 60000,
        },
      },
      performance: {
        batchSize: 100,
        maxConcurrentOperations: 10,
        connectionPoolSize: 5,
        indexBuildThreshold: 1000,
        enableQueryOptimization: true,
      },
      monitoring: {
        enabled: true,
        metricsEnabled: true,
        loggingEnabled: true,
        alertingEnabled: false,
        samplingRate: 1.0,
        reportingInterval: 60000,
      },
    };

    const result = ConfigValidator.validate(validConfig);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid configuration', () => {
    const invalidConfig = {
      core: {
        environment: 'invalid' as const,
        version: 'not-semver',
        logLevel: 'debug' as const,
        debug: false,
      },
      database: {
        name: 'test-db',
        version: 1,
        storageQuota: -100,
        indexPath: '/data/test',
        enableCompression: true,
        enableEncryption: false,
        autoCleanup: true,
        cleanupInterval: 86400000,
      },
      cache: {
        enabled: true,
        maxSize: 1000,
        ttl: 3600000,
        strategy: 'lru' as const,
      },
      security: {
        enableEncryption: false,
        enableValidation: true,
        maxRetries: 3,
        rateLimit: {
          enabled: true,
          maxRequests: 100,
          windowMs: 60000,
        },
      },
      performance: {
        batchSize: 100,
        maxConcurrentOperations: 10,
        connectionPoolSize: 5,
        indexBuildThreshold: 1000,
        enableQueryOptimization: true,
      },
      monitoring: {
        enabled: true,
        metricsEnabled: true,
        loggingEnabled: true,
        alertingEnabled: false,
        samplingRate: 1.0,
        reportingInterval: 60000,
      },
    };

    const result = ConfigValidator.validate(invalidConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('VersionManager', () => {
  let versionManager: VersionManager;

  beforeEach(() => {
    versionManager = new VersionManager({
      currentVersion: '1.0.0',
    });
  });

  it('should parse version correctly', () => {
    const version = versionManager.getCurrentVersion();
    expect(version.major).toBe(1);
    expect(version.minor).toBe(0);
    expect(version.patch).toBe(0);
  });

  it('should detect migration need', async () => {
    const needsMigration = await versionManager.needsMigration('0.9.0');
    expect(needsMigration).toBe(true);
  });

  it('should not need migration for same version', async () => {
    const needsMigration = await versionManager.needsMigration('1.0.0');
    expect(needsMigration).toBe(false);
  });

  it('should check compatibility', async () => {
    const compatible = await versionManager.checkCompatibility('1.0.0');
    expect(compatible.compatible).toBe(true);
  });

  it('should reject incompatible version', async () => {
    const compatible = await versionManager.checkCompatibility('2.0.0');
    expect(compatible.compatible).toBe(false);
  });

  it('should compare versions correctly', () => {
    expect(versionManager.compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(versionManager.compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
    expect(versionManager.compareVersions('1.0.0', '1.0.0')).toBe(0);
  });
});

describe('StorageManager', () => {
  let storageManager: StorageManager;

  beforeEach(() => {
    storageManager = new StorageManager({
      quota: 100 * 1024 * 1024,
      warningThreshold: 0.8,
      criticalThreshold: 0.95,
    });
  });

  it('should initialize with correct quota', () => {
    const quota = storageManager.getQuota();
    expect(quota.quota).toBe(100 * 1024 * 1024);
  });

  it('should track usage', async () => {
    await storageManager.updateUsage(50 * 1024 * 1024);
    const usage = await storageManager.getUsage();
    expect(usage.used).toBe(50 * 1024 * 1024);
    expect(usage.percentage).toBe(0.5);
  });

  it('should emit warning when threshold reached', async () => {
    let warningEmitted = false;
    storageManager.on('quota-warning', () => {
      warningEmitted = true;
    });

    await storageManager.updateUsage(85 * 1024 * 1024);
    expect(warningEmitted).toBe(true);
  });

  it('should emit critical when threshold exceeded', async () => {
    let criticalEmitted = false;
    storageManager.on('quota-critical', () => {
      criticalEmitted = true;
    });

    await storageManager.updateUsage(96 * 1024 * 1024);
    expect(criticalEmitted).toBe(true);
  });

  it('should format bytes correctly', () => {
    expect(storageManager.formatBytes(1024)).toBe('1.00 KB');
    expect(storageManager.formatBytes(1024 * 1024)).toBe('1.00 MB');
    expect(storageManager.formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
  });
});

describe('EnvManager', () => {
  it('should load environment variables', () => {
    const envManager = new EnvManager();
    const env = envManager.load();
    expect(env).toBeDefined();
  });

  it('should validate environment', () => {
    const envManager = new EnvManager();
    const result = envManager.validate();
    expect(result).toBeDefined();
    expect(typeof result.isValid).toBe('boolean');
  });

  it('should detect missing encryption key', () => {
    const envManager = new EnvManager();
    envManager.set('enableEncryption', true);
    envManager.set('encryptionKey', undefined);
    const result = envManager.validate();
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Encryption'))).toBe(true);
  });
});
