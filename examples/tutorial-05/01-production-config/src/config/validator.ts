/**
 * Configuration Validator
 * Validates configuration objects against the schema
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
import { ProductionConfigSchema } from './schema.js';
import { getDefaultsForEnvironment } from './defaults.js';

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
  warnings: Array<{
    path: string;
    message: string;
  }>;
}

export class ConfigValidator {
  /**
   * Validate complete configuration
   */
  static validate(config: unknown): ValidationResult {
    const result = ProductionConfigSchema.safeParse(config);

    if (result.success) {
      return {
        isValid: true,
        errors: [],
        warnings: ConfigValidator.checkWarnings(result.data),
      };
    }

    return {
      isValid: false,
      errors: result.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      })),
      warnings: [],
    };
  }

  /**
   * Check for configuration warnings
   */
  private static checkWarnings(
    config: ProductionConfigInput
  ): Array<{ path: string; message: string }> {
    const warnings: Array<{ path: string; message: string }> = [];

    // Check storage quota
    if (config.database.storageQuota < 50 * 1024 * 1024) {
      warnings.push({
        path: 'database.storageQuota',
        message: 'Storage quota is less than 50MB, which may not be sufficient for production use',
      });
    }

    // Check encryption in production
    if (
      config.core.environment === 'production' &&
      !config.security.enableEncryption
    ) {
      warnings.push({
        path: 'security.enableEncryption',
        message: 'Encryption is disabled in production environment',
      });
    }

    // Check cache size
    if (config.cache.maxSize < 100) {
      warnings.push({
        path: 'cache.maxSize',
        message: 'Cache size is very small, consider increasing for better performance',
      });
    }

    // Check monitoring
    if (config.core.environment === 'production' && !config.monitoring.enabled) {
      warnings.push({
        path: 'monitoring.enabled',
        message: 'Monitoring is disabled in production environment',
      });
    }

    // Check batch size
    if (config.performance.batchSize > 1000) {
      warnings.push({
        path: 'performance.batchSize',
        message: 'Large batch size may cause memory issues',
      });
    }

    return warnings;
  }

  /**
   * Validate and merge with defaults
   */
  static validateWithDefaults(
    config: Partial<ProductionConfigInput>
  ): ValidationResult {
    const environment = config.core?.environment || 'development';
    const defaults = getDefaultsForEnvironment(environment);

    const merged: ProductionConfigInput = {
      core: { ...defaults.core, ...config.core },
      database: { ...defaults.database, ...config.database },
      cache: { ...defaults.cache, ...config.cache },
      security: { ...defaults.security, ...config.security },
      performance: { ...defaults.performance, ...config.performance },
      monitoring: { ...defaults.monitoring, ...config.monitoring },
    };

    return this.validate(merged);
  }

  /**
   * Validate specific configuration section
   */
  static validateCore(config: unknown): ValidationResult {
    const { CoreConfigSchema } = require('./schema');
    const result = CoreConfigSchema.safeParse(config);

    return {
      isValid: result.success,
      errors: result.success
        ? []
        : result.error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
      warnings: [],
    };
  }

  static validateDatabase(config: unknown): ValidationResult {
    const { DatabaseConfigSchema } = require('./schema');
    const result = DatabaseConfigSchema.safeParse(config);

    return {
      isValid: result.success,
      errors: result.success
        ? []
        : result.error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
      warnings: [],
    };
  }

  static validateCache(config: unknown): ValidationResult {
    const { CacheConfigSchema } = require('./schema');
    const result = CacheConfigSchema.safeParse(config);

    return {
      isValid: result.success,
      errors: result.success
        ? []
        : result.error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
      warnings: [],
    };
  }

  static validateSecurity(config: unknown): ValidationResult {
    const { SecurityConfigSchema } = require('./schema');
    const result = SecurityConfigSchema.safeParse(config);

    const warnings: Array<{ path: string; message: string }> = [];

    if (result.success && !result.data.enableEncryption && result.data.encryptionKey) {
      warnings.push({
        path: 'security.encryptionKey',
        message: 'Encryption key is provided but encryption is disabled',
      });
    }

    return {
      isValid: result.success,
      errors: result.success
        ? []
        : result.error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
      warnings,
    };
  }
}
