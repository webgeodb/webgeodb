/**
 * WebGeoDB Production Configuration Example
 *
 * This example demonstrates production-ready configuration for WebGeoDB including:
 * - Version management and migration strategies
 * - Environment variable configuration and validation
 * - Storage quota management
 * - Configuration validation and type safety
 * - Production environment checklist
 */

export { ProductionConfig } from './config/index.js';
export { VersionManager } from './version/index.js';
export { StorageManager } from './storage/index.js';
export { EnvManager } from './env/index.js';
export { ProductionChecklist } from './production/index.js';
export { PerformanceOptimizer } from './production/optimizer.js';

// Type exports
export type {
  ProductionConfigOptions,
  DatabaseConfig,
  CacheConfig,
  SecurityConfig
} from './config/index.js';

export type {
  VersionInfo,
  MigrationResult,
  CompatibilityCheck
} from './version/index.js';

export type {
  StorageUsage,
  StorageQuota,
  CleanupOptions
} from './storage/index.js';

export type {
  EnvironmentConfig,
  EnvValidationResult
} from './env/index.js';

export type {
  ChecklistResult,
  ChecklistItem,
  OptimizationResult
} from './production/index.js';
