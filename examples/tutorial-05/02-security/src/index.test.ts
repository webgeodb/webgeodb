/**
 * Security Example Tests
 */

import { describe, it, expect } from 'vitest';
import { InputValidator } from '../src/validation/index.js';
import { EncryptionManager } from '../src/encryption/index.js';
import { RBACManager } from '../src/rbac/index.js';
import { AuditLogger } from '../src/audit/index.js';
import { RateLimiter } from '../src/rate-limit/index.js';

describe('Security Examples', () => {
  describe('InputValidator', () => {
    it('should validate coordinates', () => {
      const validator = new InputValidator();
      const result = validator.validateCoordinates({
        latitude: 37.7749,
        longitude: -122.4194
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      const validator = new InputValidator();
      const result = validator.validateCoordinates({
        latitude: 91, // Invalid
        longitude: -122.4194
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('EncryptionManager', () => {
    it('should encrypt and decrypt data', async () => {
      const encryption = new EncryptionManager({
        key: 'test-32-character-encryption-key-123456'
      });

      const data = { test: 'secret data' };
      const encrypted = await encryption.encrypt(data);
      const decrypted = await encryption.decrypt(encrypted);

      expect(decrypted).toEqual(data);
    });
  });

  describe('RBACManager', () => {
    it('should check permissions correctly', async () => {
      const rbac = new RBACManager();
      await rbac.assignRole('user-123', 'user');

      const canRead = await rbac.checkAccess('user-123', 'read', 'points');
      expect(canRead).toBe(true);

      const canDelete = await rbac.checkAccess('user-123', 'delete', 'points');
      expect(canDelete).toBe(false);
    });
  });

  describe('AuditLogger', () => {
    it('should log events', async () => {
      const audit = new AuditLogger({ enabled: true });
      await audit.logEvent({
        type: 'DATA_READ',
        userId: 'user-123',
        action: 'read',
        success: true,
        timestamp: Date.now()
      });

      expect(audit.getEventCount()).toBe(1);
    });
  });

  describe('RateLimiter', () => {
    it('should limit requests', async () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 60000
      });

      const result1 = await limiter.check('user-123');
      expect(result1.allowed).toBe(true);

      const result2 = await limiter.check('user-123');
      expect(result2.allowed).toBe(true);

      const result3 = await limiter.check('user-123');
      expect(result3.allowed).toBe(false);
    });
  });
});
