/**
 * Default configurations for different environments
 */

import type {
  CoreConfig,
  DatabaseConfig,
  CacheConfig,
  SecurityConfig,
  PerformanceConfig,
  MonitoringConfig,
} from './schema.js';

/**
 * Default development configuration
 */
export const developmentDefaults: Partial<CoreConfig> & {
  database: Partial<DatabaseConfig>;
  cache: Partial<CacheConfig>;
  security: Partial<SecurityConfig>;
  performance: Partial<PerformanceConfig>;
  monitoring: Partial<MonitoringConfig>;
} = {
  environment: 'development',
  version: '1.0.0',
  logLevel: 'debug',
  debug: true,
  database: {
    storageQuota: 100 * 1024 * 1024, // 100MB
    enableCompression: false,
    enableEncryption: false,
    autoCleanup: false,
  },
  cache: {
    enabled: true,
    maxSize: 500,
    ttl: 1800000, // 30 minutes
  },
  security: {
    enableEncryption: false,
    enableValidation: true,
    maxRetries: 5,
    rateLimit: {
      enabled: false,
    },
  },
  performance: {
    batchSize: 50,
    maxConcurrentOperations: 5,
    connectionPoolSize: 3,
  },
  monitoring: {
    enabled: true,
    samplingRate: 1.0,
  },
};

/**
 * Default staging configuration
 */
export const stagingDefaults: Partial<CoreConfig> & {
  database: Partial<DatabaseConfig>;
  cache: Partial<CacheConfig>;
  security: Partial<SecurityConfig>;
  performance: Partial<PerformanceConfig>;
  monitoring: Partial<MonitoringConfig>;
} = {
  environment: 'staging',
  version: '1.0.0',
  logLevel: 'info',
  debug: false,
  database: {
    storageQuota: 250 * 1024 * 1024, // 250MB
    enableCompression: true,
    enableEncryption: true,
    autoCleanup: true,
  },
  cache: {
    enabled: true,
    maxSize: 1000,
    ttl: 3600000, // 1 hour
  },
  security: {
    enableEncryption: true,
    enableValidation: true,
    maxRetries: 3,
    rateLimit: {
      enabled: true,
      maxRequests: 200,
    },
  },
  performance: {
    batchSize: 100,
    maxConcurrentOperations: 10,
    connectionPoolSize: 5,
  },
  monitoring: {
    enabled: true,
    samplingRate: 1.0,
    alertingEnabled: true,
  },
};

/**
 * Default production configuration
 */
export const productionDefaults: Partial<CoreConfig> & {
  database: Partial<DatabaseConfig>;
  cache: Partial<CacheConfig>;
  security: Partial<SecurityConfig>;
  performance: Partial<PerformanceConfig>;
  monitoring: Partial<MonitoringConfig>;
} = {
  environment: 'production',
  version: '1.0.0',
  logLevel: 'warn',
  debug: false,
  database: {
    storageQuota: 500 * 1024 * 1024, // 500MB
    enableCompression: true,
    enableEncryption: true,
    autoCleanup: true,
    cleanupInterval: 43200000, // 12 hours
  },
  cache: {
    enabled: true,
    maxSize: 2000,
    ttl: 7200000, // 2 hours
    strategy: 'lru',
  },
  security: {
    enableEncryption: true,
    enableValidation: true,
    maxRetries: 3,
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000,
    },
  },
  performance: {
    batchSize: 200,
    maxConcurrentOperations: 20,
    connectionPoolSize: 10,
    enableQueryOptimization: true,
  },
  monitoring: {
    enabled: true,
    metricsEnabled: true,
    loggingEnabled: true,
    alertingEnabled: true,
    samplingRate: 0.1, // 10% sampling
    reportingInterval: 300000, // 5 minutes
  },
};

/**
 * Get default configuration for environment
 */
export function getDefaultsForEnvironment(
  environment: 'development' | 'staging' | 'production'
): typeof developmentDefaults {
  switch (environment) {
    case 'development':
      return developmentDefaults;
    case 'staging':
      return stagingDefaults;
    case 'production':
      return productionDefaults;
  }
}
