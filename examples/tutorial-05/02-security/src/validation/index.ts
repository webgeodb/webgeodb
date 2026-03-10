/**
 * Input Validator
 * Provides comprehensive input validation for geographic and user data
 */

import { z } from 'zod';
import { ValidationSchema } from './schema.js';
import { InputSanitizer } from './sanitizer.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
}

export class InputValidator {
  private sanitizer: InputSanitizer;
  private schemas: Map<string, z.ZodSchema>;

  constructor() {
    this.sanitizer = new InputSanitizer();
    this.schemas = new Map();
    this.registerDefaultSchemas();
  }

  /**
   * Register default validation schemas
   */
  private registerDefaultSchemas(): void {
    // Point validation schema
    this.schemas.set('point', ValidationSchema.point);

    // Polygon validation schema
    this.schemas.set('polygon', ValidationSchema.polygon);

    // Circle validation schema
    this.schemas.set('circle', ValidationSchema.circle);

    // BoundingBox validation schema
    this.schemas.set('bbox', ValidationSchema.boundingBox);

    // Query parameters schema
    this.schemas.set('query', ValidationSchema.query);

    // User ID schema
    this.schemas.set('userId', ValidationSchema.userId);

    // Metadata schema
    this.schemas.set('metadata', ValidationSchema.metadata);
  }

  /**
   * Validate data against schema
   */
  validate(data: any, schemaName: string): ValidationResult {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return {
        valid: false,
        errors: [`Unknown schema: ${schemaName}`],
        warnings: [],
      };
    }

    const result = schema.safeParse(data);

    if (result.success) {
      return {
        valid: true,
        errors: [],
        warnings: [],
        data: result.data,
      };
    }

    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      warnings: [],
    };
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(coords: { latitude: number; longitude: number }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate latitude
    if (typeof coords.latitude !== 'number' || isNaN(coords.latitude)) {
      errors.push('Latitude must be a number');
    } else if (coords.latitude < -90 || coords.latitude > 90) {
      errors.push('Latitude must be between -90 and 90');
    }

    // Validate longitude
    if (typeof coords.longitude !== 'number' || isNaN(coords.longitude)) {
      errors.push('Longitude must be a number');
    } else if (coords.longitude < -180 || coords.longitude > 180) {
      errors.push('Longitude must be between -180 and 180');
    }

    // Warnings for extreme values
    if (Math.abs(coords.latitude) > 85) {
      warnings.push('Latitude is near the poles, ensure this is correct');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate radius
   */
  validateRadius(radius: number): ValidationResult {
    const errors: string[] = [];

    if (typeof radius !== 'number' || isNaN(radius)) {
      errors.push('Radius must be a number');
    } else if (radius <= 0) {
      errors.push('Radius must be positive');
    } else if (radius > 10000000) { // 10,000 km
      errors.push('Radius is too large (max 10,000 km)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validate query parameters
   */
  validateQuery(query: any): ValidationResult {
    return this.validate(query, 'query');
  }

  /**
   * Validate and sanitize user input
   */
  validateAndSanitize(input: string, schemaName: string): ValidationResult {
    // First sanitize
    const sanitized = this.sanitizer.sanitize(input);

    // Then validate
    const result = this.validate(sanitized, schemaName);

    return {
      ...result,
      data: sanitized,
    };
  }

  /**
   * Validate GeoJSON
   */
  validateGeoJSON(geojson: any): ValidationResult {
    const errors: string[] = [];

    // Check type
    if (!geojson.type || typeof geojson.type !== 'string') {
      errors.push('GeoJSON must have a type property');
      return { valid: false, errors, warnings: [] };
    }

    // Validate based on type
    switch (geojson.type) {
      case 'Point':
        return this.validate(geojson, 'point');
      case 'Polygon':
        return this.validate(geojson, 'polygon');
      case 'FeatureCollection':
        if (!Array.isArray(geojson.features)) {
          errors.push('FeatureCollection must have features array');
        }
        break;
      default:
        errors.push(`Unsupported GeoJSON type: ${geojson.type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validate user ID
   */
  validateUserId(userId: string): ValidationResult {
    return this.validate(userId, 'userId');
  }

  /**
   * Validate metadata object
   */
  validateMetadata(metadata: any): ValidationResult {
    return this.validate(metadata, 'metadata');
  }

  /**
   * Register custom schema
   */
  registerSchema(name: string, schema: z.ZodSchema): void {
    this.schemas.set(name, schema);
  }

  /**
   * Get schema
   */
  getSchema(name: string): z.ZodSchema | undefined {
    return this.schemas.get(name);
  }
}
