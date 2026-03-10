/**
 * Environment Manager
 * Handles loading and validation of environment variables
 */

export interface EnvironmentConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  databaseName: string;
  storageQuota: number;
  indexPath: string;
  backupPath?: string;
  enableCompression: boolean;
  enableEncryption: boolean;
  encryptionKey?: string;
  cacheSize: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  debug: boolean;
  autoCleanup: boolean;
  enableMonitoring: boolean;
}

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class EnvManager {
  private env: EnvironmentConfig;

  constructor() {
    this.env = this.loadFromProcessEnv();
  }

  /**
   * Load environment variables from process.env
   */
  load(): EnvironmentConfig {
    return this.env;
  }

  /**
   * Load from process.env
   */
  private loadFromProcessEnv(): EnvironmentConfig {
    return {
      environment: (process.env.WEBGEODB_ENVIRONMENT as EnvironmentConfig['environment']) || 'development',
      version: process.env.WEBGEODB_VERSION || '1.0.0',
      databaseName: process.env.WEBGEODB_DATABASE_NAME || 'webgeodb',
      storageQuota: parseInt(process.env.WEBGEODB_STORAGE_QUOTA || '104857600', 10), // 100MB
      indexPath: process.env.WEBGEODB_INDEX_PATH || '/data/webgeodb',
      backupPath: process.env.WEBGEODB_BACKUP_PATH,
      enableCompression: process.env.WEBGEODB_ENABLE_COMPRESSION === 'true',
      enableEncryption: process.env.WEBGEODB_ENABLE_ENCRYPTION === 'true',
      encryptionKey: process.env.WEBGEODB_ENCRYPTION_KEY,
      cacheSize: parseInt(process.env.WEBGEODB_CACHE_SIZE || '1000', 10),
      logLevel: (process.env.WEBGEODB_LOG_LEVEL as EnvironmentConfig['logLevel']) || 'info',
      debug: process.env.WEBGEODB_DEBUG === 'true',
      autoCleanup: process.env.WEBGEODB_AUTO_CLEANUP !== 'false',
      enableMonitoring: process.env.WEBGEODB_ENABLE_MONITORING !== 'false',
    };
  }

  /**
   * Validate environment configuration
   */
  validate(): EnvValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate environment
    if (!['development', 'staging', 'production'].includes(this.env.environment)) {
      errors.push(`Invalid environment: ${this.env.environment}`);
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(this.env.version)) {
      errors.push(`Invalid version format: ${this.env.version}. Use semver (e.g., 1.0.0)`);
    }

    // Validate storage quota
    if (this.env.storageQuota <= 0) {
      errors.push('Storage quota must be positive');
    }

    if (this.env.storageQuota > 1024 * 1024 * 1024) {
      warnings.push('Storage quota exceeds 1GB, which may cause issues in some browsers');
    }

    // Validate encryption
    if (this.env.enableEncryption && !this.env.encryptionKey) {
      errors.push('Encryption is enabled but no encryption key is provided');
    }

    if (this.env.encryptionKey && this.env.encryptionKey.length < 32) {
      errors.push('Encryption key must be at least 32 characters');
    }

    // Validate cache size
    if (this.env.cacheSize <= 0) {
      errors.push('Cache size must be positive');
    }

    // Production environment checks
    if (this.env.environment === 'production') {
      if (!this.env.enableEncryption) {
        warnings.push('Encryption is disabled in production environment');
      }

      if (!this.env.enableMonitoring) {
        warnings.push('Monitoring is disabled in production environment');
      }

      if (this.env.debug) {
        warnings.push('Debug mode is enabled in production environment');
      }

      if (this.env.logLevel === 'debug') {
        warnings.push('Debug log level in production environment may impact performance');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get environment variable
   */
  get(key: keyof EnvironmentConfig): any {
    return this.env[key];
  }

  /**
   * Set environment variable
   */
  set(key: keyof EnvironmentConfig, value: any): void {
    (this.env as any)[key] = value;
  }

  /**
   * Export environment as object
   */
  export(): EnvironmentConfig {
    return { ...this.env };
  }

  /**
   * Load from .env file content
   */
  static fromEnvFile(content: string): EnvironmentConfig {
    const env: any = {};

    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        env[key] = value;
      }
    });

    // Merge with process.env
    const manager = new EnvManager();
    const currentEnv = manager.export();

    // Override with file values
    Object.keys(env).forEach(key => {
      const envKey = key as keyof EnvironmentConfig;
      if (envKey in currentEnv) {
        (currentEnv as any)[envKey] = env[key];
      }
    });

    return currentEnv;
  }
}
