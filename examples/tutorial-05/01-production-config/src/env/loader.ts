/**
 * Environment Variable Loader
 * Provides utilities for loading environment variables from various sources
 */

import * as fs from 'fs';
import * as path from 'path';

export interface LoadOptions {
  envFile?: string;
  prefix?: string;
  required?: string[];
}

export class EnvLoader {
  /**
   * Load environment variables from .env file
   */
  static loadFromFile(filePath: string): Record<string, string> {
    if (!fs.existsSync(filePath)) {
      return {};
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseEnvContent(content);
  }

  /**
   * Parse .env file content
   */
  static parseEnvContent(content: string): Record<string, string> {
    const env: Record<string, string> = {};

    content.split('\n').forEach(line => {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      // Parse key=value
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) {
        return;
      }

      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Expand variables
      value = this.expandVariables(value);

      env[key] = value;
    });

    return env;
  }

  /**
   * Expand environment variables in value
   */
  static expandVariables(value: string): string {
    return value.replace(/\$\{([^}]+)\}/g, (_, key) => {
      return process.env[key] || '';
    });
  }

  /**
   * Load environment with options
   */
  static load(options: LoadOptions = {}): Record<string, string> {
    const {
      envFile = '.env',
      prefix = 'WEBGEODB_',
      required = [],
    } = options;

    // Load from .env file
    const envPath = path.resolve(process.cwd(), envFile);
    const fileEnv = this.loadFromFile(envPath);

    // Load from process.env with prefix
    const processEnv: Record<string, string> = {};
    Object.keys(process.env).forEach(key => {
      if (key.startsWith(prefix)) {
        const newKey = key.substring(prefix.length);
        processEnv[newKey] = process.env[key]!;
      }
    });

    // Merge (process.env takes precedence)
    const merged = { ...fileEnv, ...processEnv };

    // Check required variables
    const missing = required.filter(key => !(key in merged) || !merged[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return merged;
  }

  /**
   * Validate environment variables
   */
  static validate(
    env: Record<string, string>,
    schema: Record<string, { required?: boolean; type?: string; pattern?: RegExp }>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    Object.keys(schema).forEach(key => {
      const def = schema[key];

      // Check required
      if (def.required && !env[key]) {
        errors.push(`${key} is required`);
        return;
      }

      // Skip validation if not present and not required
      if (!env[key]) {
        return;
      }

      const value = env[key];

      // Check type
      if (def.type === 'number') {
        if (isNaN(parseInt(value, 10))) {
          errors.push(`${key} must be a number`);
        }
      }

      if (def.type === 'boolean') {
        if (!['true', 'false'].includes(value.toLowerCase())) {
          errors.push(`${key} must be a boolean (true/false)`);
        }
      }

      // Check pattern
      if (def.pattern && !def.pattern.test(value)) {
        errors.push(`${key} does not match required pattern`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
