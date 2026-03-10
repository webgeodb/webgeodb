/**
 * WebGeoDB Security Example
 *
 * This example demonstrates comprehensive security measures for WebGeoDB including:
 * - Input validation and sanitization
 * - XSS attack prevention
 * - Data encryption (AES-256-GCM)
 * - RBAC permission management
 * - Security audit logging
 * - Rate limiting
 * - CSRF protection
 */

export { InputValidator } from './validation/index.js';
export { EncryptionManager } from './encryption/index.js';
export { RBACManager } from './rbac/index.js';
export { AuditLogger } from './audit/index.js';
export { XSSCleaner } from './xss/index.js';
export { RateLimiter } from './rate-limit/index.js';

// Type exports
export type {
  ValidationResult,
  ValidationSchema,
  SanitizationOptions
} from './validation/index.js';

export type {
  EncryptionOptions,
  EncryptedData
} from './encryption/index.js';

export type {
  Role,
  Permission,
  AccessPolicy
} from './rbac/index.js';

export type {
  AuditEvent,
  AuditReport,
  AuditLogOptions
} from './audit/index.js';

export type {
  RateLimitOptions,
  RateLimitResult
} from './rate-limit/index.js';
