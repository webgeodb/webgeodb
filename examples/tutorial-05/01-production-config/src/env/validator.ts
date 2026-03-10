/**
 * Environment Variable Validator
 */

export interface EnvValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean';
    pattern?: RegExp;
    min?: number;
    max?: number;
    enum?: string[];
    description?: string;
  };
}

export class EnvValidator {
  /**
   * Validate environment variables against schema
   */
  static validate(
    env: Record<string, string>,
    schema: EnvValidationSchema
  ): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];

    Object.keys(schema).forEach(key => {
      const def = schema[key];

      // Check required
      if (def.required && !env[key]) {
        errors.push({
          field: key,
          message: def.description ? `${def.description} is required` : `${key} is required`,
        });
        return;
      }

      // Skip validation if not present and not required
      if (!env[key]) {
        return;
      }

      const value = env[key];

      // Check type
      if (def.type === 'number') {
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          errors.push({ field: key, message: `${key} must be a number` });
        } else {
          // Check min/max
          if (def.min !== undefined && num < def.min) {
            errors.push({ field: key, message: `${key} must be at least ${def.min}` });
          }
          if (def.max !== undefined && num > def.max) {
            errors.push({ field: key, message: `${key} must be at most ${def.max}` });
          }
        }
      }

      if (def.type === 'boolean') {
        if (!['true', 'false'].includes(value.toLowerCase())) {
          errors.push({ field: key, message: `${key} must be true or false` });
        }
      }

      // Check enum
      if (def.enum && !def.enum.includes(value)) {
        errors.push({
          field: key,
          message: `${key} must be one of: ${def.enum.join(', ')}`,
        });
      }

      // Check pattern
      if (def.pattern && !def.pattern.test(value)) {
        errors.push({
          field: key,
          message: `${key} does not match required format`,
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get default schema for WebGeoDB
   */
  static getDefaultSchema(): EnvValidationSchema {
    return {
      ENVIRONMENT: {
        required: true,
        type: 'string',
        enum: ['development', 'staging', 'production'],
        description: 'Application environment',
      },
      VERSION: {
        required: true,
        type: 'string',
        pattern: /^\d+\.\d+\.\d+$/,
        description: 'Application version (semver)',
      },
      DATABASE_NAME: {
        required: false,
        type: 'string',
        description: 'Database name',
      },
      STORAGE_QUOTA: {
        required: false,
        type: 'number',
        min: 1,
        max: 1073741824, // 1GB
        description: 'Storage quota in bytes',
      },
      INDEX_PATH: {
        required: false,
        type: 'string',
        description: 'Index storage path',
      },
      ENABLE_COMPRESSION: {
        required: false,
        type: 'boolean',
        description: 'Enable compression',
      },
      ENABLE_ENCRYPTION: {
        required: false,
        type: 'boolean',
        description: 'Enable encryption',
      },
      ENCRYPTION_KEY: {
        required: false,
        type: 'string',
        min: 32,
        description: 'Encryption key (min 32 characters)',
      },
      CACHE_SIZE: {
        required: false,
        type: 'number',
        min: 1,
        max: 100000,
        description: 'Cache size',
      },
      LOG_LEVEL: {
        required: false,
        type: 'string',
        enum: ['debug', 'info', 'warn', 'error'],
        description: 'Log level',
      },
      DEBUG: {
        required: false,
        type: 'boolean',
        description: 'Debug mode',
      },
      AUTO_CLEANUP: {
        required: false,
        type: 'boolean',
        description: 'Enable automatic cleanup',
      },
      ENABLE_MONITORING: {
        required: false,
        type: 'boolean',
        description: 'Enable monitoring',
      },
    };
  }

  /**
   * Validate WebGeoDB environment
   */
  static validateWebGeoDB(
    env: Record<string, string>
  ): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
    const schema = this.getDefaultSchema();
    return this.validate(env, schema);
  }
}
