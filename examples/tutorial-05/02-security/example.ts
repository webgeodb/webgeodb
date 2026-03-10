/**
 * Security Example Usage
 *
 * This example demonstrates how to use the security features
 */

import { InputValidator } from './src/validation/index.js';
import { EncryptionManager } from './src/encryption/index.js';
import { RBACManager } from './src/rbac/index.js';
import { AuditLogger } from './src/audit/index.js';
import { XSSCleaner } from './src/xss/index.js';
import { RateLimiter } from './src/rate-limit/index.js';

async function main() {
  console.log('=== WebGeoDB Security Example ===\n');

  // 1. Input validation
  console.log('1. Input Validation:');
  const validator = new InputValidator();

  const coordResult = validator.validateCoordinates({
    latitude: 37.7749,
    longitude: -122.4194
  });
  console.log(`   Coordinates valid: ${coordResult.valid}`);

  const invalidCoord = validator.validateCoordinates({
    latitude: 91, // Invalid
    longitude: -122.4194
  });
  console.log(`   Invalid coordinates detected: ${!invalidCoord.valid}\n`);

  // 2. Data encryption
  console.log('2. Data Encryption:');
  const encryption = new EncryptionManager({
    key: 'test-32-character-encryption-key-123456'
  });

  const sensitiveData = {
    type: 'Point',
    coordinates: [37.7749, -122.4194],
    userId: 'user-123'
  };

  const encrypted = await encryption.encrypt(sensitiveData);
  console.log('   Data encrypted successfully');

  const decrypted = await encryption.decrypt(encrypted);
  console.log(`   Data decrypted: ${JSON.stringify(decrypted)}\n`);

  // 3. RBAC permission management
  console.log('3. RBAC Permission Management:');
  const rbac = new RBACManager();

  await rbac.assignRole('user-123', 'user');
  console.log('   Assigned "user" role to user-123');

  const canRead = await rbac.checkAccess('user-123', 'read', 'points');
  console.log(`   Can read points: ${canRead}`);

  const canDelete = await rbac.checkAccess('user-123', 'delete', 'points');
  console.log(`   Can delete points: ${canDelete}\n`);

  // 4. Audit logging
  console.log('4. Audit Logging:');
  const audit = new AuditLogger({ enabled: true });

  await audit.logAuthEvent({
    type: 'login',
    userId: 'user-123',
    success: true,
    ip: '192.168.1.1'
  });
  console.log('   Login event logged');

  await audit.logDataAccess({
    action: 'read',
    resource: 'points',
    userId: 'user-123',
    recordCount: 10
  });
  console.log('   Data access event logged\n');

  // 5. XSS protection
  console.log('5. XSS Protection:');
  const xssCleaner = new XSSCleaner();

  const maliciousInput = '<script>alert("XSS")</script>Hello';
  const cleaned = xssCleaner.clean(maliciousInput);
  console.log(`   Original: ${maliciousInput}`);
  console.log(`   Cleaned: ${cleaned}\n`);

  // 6. Rate limiting
  console.log('6. Rate Limiting:');
  const limiter = new RateLimiter({
    maxRequests: 5,
    windowMs: 60000 // 1 minute
  });

  let requestCount = 0;
  for (let i = 0; i < 7; i++) {
    const result = await limiter.check('user-123');
    if (result.allowed) {
      requestCount++;
    }
  }
  console.log(`   Allowed ${requestCount} out of 7 requests`);
  console.log('   Rate limit working correctly\n');

  console.log('=== Security example completed successfully ===');
}

// Run the example
main().catch(console.error);
