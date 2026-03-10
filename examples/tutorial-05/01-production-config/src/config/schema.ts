/**
 * Configuration Schema Definitions
 * Provides type-safe configuration validation using Zod
 */

import { z } from 'zod';

/**
 * Environment types
 */
export const EnvironmentSchema = z.enum(['development', 'staging', 'production']);

/**
 * Log level schema
 */
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

/**
 * Core configuration schema
 */
export const CoreConfigSchema = z.object({
  environment: EnvironmentSchema,
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid version format. Use semver (e.g., 1.0.0)'),
  logLevel: LogLevelSchema,
  debug: z.boolean().default(false),
});

/**
 * Database configuration schema
 */
export const DatabaseConfigSchema = z.object({
  name: z.string().min(1, 'Database name is required'),
  version: z.number().int().positive(),
  storageQuota: z.number().int().positive().max(1024 * 1024 * 1024), // Max 1GB
  indexPath: z.string().min(1, 'Index path is required'),
  backupPath: z.string().optional(),
  enableCompression: z.boolean().default(true),
  enableEncryption: z.boolean().default(false),
  autoCleanup: z.boolean().default(true),
  cleanupInterval: z.number().int().positive().default(86400000), // 24 hours
});

/**
 * Cache configuration schema
 */
export const CacheConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxSize: z.number().int().positive().default(1000),
  ttl: z.number().int().positive().default(3600000), // 1 hour
  strategy: z.enum(['lru', 'fifo', 'lfu']).default('lru'),
});

/**
 * Security configuration schema
 */
export const SecurityConfigSchema = z.object({
  enableEncryption: z.boolean().default(false),
  encryptionKey: z.string().min(32, 'Encryption key must be at least 32 characters').optional(),
  enableValidation: z.boolean().default(true),
  maxRetries: z.number().int().positive().max(10).default(3),
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    maxRequests: z.number().int().positive().default(100),
    windowMs: z.number().int().positive().default(60000), // 1 minute
  }),
});

/**
 * Performance configuration schema
 */
export const PerformanceConfigSchema = z.object({
  batchSize: z.number().int().positive().default(100),
  maxConcurrentOperations: z.number().int().positive().default(10),
  connectionPoolSize: z.number().int().positive().default(5),
  indexBuildThreshold: z.number().int().positive().default(1000),
  enableQueryOptimization: z.boolean().default(true),
});

/**
 * Monitoring configuration schema
 */
export const MonitoringConfigSchema = z.object({
  enabled: z.boolean().default(true),
  metricsEnabled: z.boolean().default(true),
  loggingEnabled: z.boolean().default(true),
  alertingEnabled: z.boolean().default(false),
  samplingRate: z.number().min(0).max(1).default(1.0),
  reportingInterval: z.number().int().positive().default(60000), // 1 minute
});

/**
 * Complete production configuration schema
 */
export const ProductionConfigSchema = z.object({
  core: CoreConfigSchema,
  database: DatabaseConfigSchema,
  cache: CacheConfigSchema,
  security: SecurityConfigSchema,
  performance: PerformanceConfigSchema,
  monitoring: MonitoringConfigSchema,
});

/**
 * Type exports
 */
export type Environment = z.infer<typeof EnvironmentSchema>;
export type LogLevel = z.infer<typeof LogLevelSchema>;
export type CoreConfig = z.infer<typeof CoreConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;
export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;
export type ProductionConfigInput = z.infer<typeof ProductionConfigSchema>;
