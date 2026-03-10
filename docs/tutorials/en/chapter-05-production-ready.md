# Chapter 5: Production Best Practices

> **Learning Time**: 60-90 minutes | **Prerequisites**: Chapters 1-4

## Learning Objectives

After completing this chapter, you will be able to:
- Configure WebGeoDB applications for production environments
- Implement comprehensive security measures
- Establish a complete testing strategy
- Monitor application performance and errors
- Create backup and disaster recovery plans
- Quickly diagnose and resolve production issues

---

## Core Concepts

### 5.1 Production Configuration

Production configuration is the foundation for ensuring stable, secure, and efficient application operation. It includes version management, environment variable management, and storage quota management.

#### Key Points

- **Version Management**: Use semantic versioning and smooth database structure upgrades
- **Environment Variables**: Distinguish between development and production configurations
- **Storage Quota**: Monitor and manage browser storage usage

**Example: Database Version Management**
```typescript
import { WebGeoDB } from '@webgeodb/core';

// Define database version
const DB_VERSION = 2;
const DB_NAME = 'enterprise-gis-platform';

// Database configuration
const dbConfig = {
  name: DB_NAME,
  version: DB_VERSION,

  // Version upgrade handling
  upgrade: (oldVersion, newVersion, transaction) => {
    console.log(`Upgrading from v${oldVersion} to v${newVersion}`);

    if (oldVersion < 1) {
      // Initialize table structure
      transaction.db.schema({
        features: {
          id: 'string',
          type: 'string',
          geometry: 'geometry',
          properties: 'json',
          createdAt: 'number',
          updatedAt: 'number',
          version: 'number'
        },
        auditLog: {
          id: 'string',
          action: 'string',
          table: 'string',
          recordId: 'string',
          userId: 'string',
          timestamp: 'number',
          changes: 'json'
        }
      });
    }

    if (oldVersion < 2) {
      // Add permission management table
      transaction.db.schema({
        permissions: {
          id: 'string',
          userId: 'string',
          resource: 'string',
          action: 'string',
          granted: 'boolean'
        }
      });
    }
  },

  // Version conflict handling
  blocked: () => {
    console.error('Database version conflict detected');
    // Notify user to close other tabs
    alert('Database version conflict detected. Please close other tabs and refresh.');
  },

  blocking: () => {
    console.log('Current tab is blocking upgrade');
    // Notify user that current tab needs to be closed
  }
};

const db = new WebGeoDB(dbConfig);
```

**Output:**
```
Upgrading from v1 to v2
Database opened successfully
```

> **💡 Tip:** Always handle all historical versions in upgrade scripts, not just adjacent versions. This ensures upgrades from any old version work correctly.

**Example: Environment Variable Management**
```typescript
// Environment configuration
interface AppConfig {
  env: 'development' | 'staging' | 'production';
  apiEndpoint: string;
  maxStorageMB: number;
  enableDebugMode: boolean;
  backupInterval: number;
}

function getConfig(): AppConfig {
  const env = (import.meta.env.MODE || 'development') as AppConfig['env'];

  const configs: Record<string, AppConfig> = {
    development: {
      env: 'development',
      apiEndpoint: 'http://localhost:3000/api',
      maxStorageMB: 100,
      enableDebugMode: true,
      backupInterval: 5 * 60 * 1000 // 5 minutes
    },
    staging: {
      env: 'staging',
      apiEndpoint: 'https://staging-api.example.com',
      maxStorageMB: 200,
      enableDebugMode: true,
      backupInterval: 15 * 60 * 1000 // 15 minutes
    },
    production: {
      env: 'production',
      apiEndpoint: 'https://api.example.com',
      maxStorageMB: 500,
      enableDebugMode: false,
      backupInterval: 60 * 60 * 1000 // 1 hour
    }
  };

  return configs[env] || configs.development;
}

const config = getConfig();
console.log(`Running in ${config.env} mode`);
```

**Example: Storage Quota Monitoring**
```typescript
class StorageManager {
  private warningThreshold = 0.8; // 80%
  private criticalThreshold = 0.95; // 95%

  async checkStorage() {
    if (!navigator.storage || !navigator.storage.estimate) {
      console.warn('Storage API not supported');
      return null;
    }

    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 1;
    const usagePercent = usage / quota;
    const usageMB = usage / (1024 * 1024);
    const quotaMB = quota / (1024 * 1024);

    const status = {
      usage,
      quota,
      usagePercent,
      usageMB: usageMB.toFixed(2),
      quotaMB: quotaMB.toFixed(2),
      level: this.getLevel(usagePercent)
    };

    console.log(`Storage: ${status.usageMB}MB / ${status.quotaMB}MB (${(usagePercent * 100).toFixed(2)}%)`);

    if (usagePercent >= this.criticalThreshold) {
      this.handleCriticalStorage(status);
    } else if (usagePercent >= this.warningThreshold) {
      this.handleWarningStorage(status);
    }

    return status;
  }

  private getLevel(percent: number): 'ok' | 'warning' | 'critical' {
    if (percent >= this.criticalThreshold) return 'critical';
    if (percent >= this.warningThreshold) return 'warning';
    return 'ok';
  }

  private handleWarningStorage(status: any) {
    console.warn('Storage usage warning:', status);
    // Notify user or automatically cleanup
    this.cleanupOldData();
  }

  private handleCriticalStorage(status: any) {
    console.error('Storage critical:', status);
    alert('Storage space is low. Please clean up old data or contact administrator.');
  }

  private async cleanupOldData() {
    const cutoffDate = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    await db.transaction('rw', [db.features, db.auditLog], async () => {
      // Delete old data
      await db.features
        .where('createdAt', '<', cutoffDate)
        .delete();

      // Delete old logs
      await db.auditLog
        .where('timestamp', '<', cutoffDate)
        .delete();
    });
  }
}

// Usage
const storageManager = new StorageManager();
setInterval(() => storageManager.checkStorage(), 60000); // Check every minute
```

---

### 5.2 Security

Production environments must implement comprehensive security measures including input validation, XSS protection, data encryption, and permission management.

#### Key Points

- **Input Validation**: Strictly validate all user input
- **XSS Protection**: Escape all dynamic content
- **Data Encryption**: Encrypt sensitive data
- **Permission Management**: Implement fine-grained access control

**Example: Input Validation**
```typescript
import { Geometry } from 'geojson';

// Data validator
class DataValidator {
  // Validate feature data
  validateFeature(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!data.id || typeof data.id !== 'string') {
      errors.push('ID is required and must be a string');
    }

    if (!data.type || typeof data.type !== 'string') {
      errors.push('Type is required and must be a string');
    }

    // Validate geometry data
    if (!this.validateGeometry(data.geometry)) {
      errors.push('Invalid geometry data');
    }

    // Validate properties
    if (data.properties && typeof data.properties !== 'object') {
      errors.push('Properties must be an object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate geometry data
  validateGeometry(geometry: any): boolean {
    if (!geometry || typeof geometry !== 'object') {
      return false;
    }

    const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];

    if (!geometry.type || !validTypes.includes(geometry.type)) {
      return false;
    }

    if (!Array.isArray(geometry.coordinates)) {
      return false;
    }

    // Validate coordinate ranges (longitude: -180 to 180, latitude: -90 to 90)
    return this.validateCoordinates(geometry.coordinates, geometry.type);
  }

  // Validate coordinates
  private validateCoordinates(coords: any, type: string): boolean {
    const validateCoord = (c: number[]) => {
      const [lng, lat] = c;
      return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
    };

    switch (type) {
      case 'Point':
        return Array.isArray(coords) && coords.length >= 2 && validateCoord(coords);

      case 'LineString':
      case 'MultiPoint':
        return Array.isArray(coords) && coords.every(c => validateCoord(c));

      case 'Polygon':
      case 'MultiLineString':
        return Array.isArray(coords) &&
               coords.every(ring => Array.isArray(ring) && ring.every(c => validateCoord(c)));

      case 'MultiPolygon':
        return Array.isArray(coords) &&
               coords.every(poly =>
                 Array.isArray(poly) &&
                 poly.every(ring =>
                   Array.isArray(ring) && ring.every(c => validateCoord(c))
                 )
               );

      default:
        return false;
    }
  }

  // Sanitize user input (prevent SQL injection, NoSQL injection, etc.)
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['";]/g, '') // Remove potential injection characters
      .trim();
  }
}

// Usage
const validator = new DataValidator();

async function insertFeature(data: any) {
  const validation = validator.validateFeature(data);

  if (!validation.valid) {
    throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
  }

  // Safely insert data
  await db.features.insert(data);
}
```

**Example: XSS Protection**
```typescript
// HTML escaping utility
class XSSProtection {
  // Escape HTML special characters
  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Safely set HTML content
  setSafeHtml(element: HTMLElement, content: string) {
    element.textContent = content;
  }

  // Safely create DOM element
  createSafeElement(tag: string, text: string): HTMLElement {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  }

  // Validate URL
  isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}

// Usage
const xss = new XSSProtection();

// ❌ Dangerous: Direct use of user input
element.innerHTML = `<div>${userInput}</div>`;

// ✅ Safe: Escape before use
element.innerHTML = `<div>${xss.escapeHtml(userInput)}</div>`;

// ✅ Safer: Use textContent
element.textContent = userInput;
```

**Example: Data Encryption**
```typescript
// Data encryption utility
class DataEncryption {
  private algorithm = 'AES-GCM';
  private keyLength = 256;

  // Generate encryption key
  async generateKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('webgeodb-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt data
  async encrypt(data: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
      { name: this.algorithm, iv },
      key,
      encoder.encode(data)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  // Decrypt data
  async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: this.algorithm, iv },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}

// Usage: Encrypt sensitive fields
async function saveSensitiveFeature(feature: any) {
  const encryption = new DataEncryption();
  const key = await encryption.generateKey(getEncryptionKey());

  // Encrypt sensitive properties
  const encryptedProperties = {
    ...feature.properties,
    sensitiveData: await encryption.encrypt(
      JSON.stringify(feature.properties.sensitiveData),
      key
    )
  };

  await db.features.insert({
    ...feature,
    properties: encryptedProperties,
    encrypted: true
  });
}
```

**Example: Permission Management**
```typescript
// Permission management system
class PermissionManager {
  // Check permission
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const permission = await db.permissions
      .where('userId')
      .equals(userId)
      .and(p => p.resource === resource && p.action === action)
      .first();

    return permission?.granted || false;
  }

  // Grant permission
  async grantPermission(userId: string, resource: string, action: string) {
    await db.permissions.put({
      id: `${userId}:${resource}:${action}`,
      userId,
      resource,
      action,
      granted: true,
      grantedAt: Date.now(),
      grantedBy: getCurrentUserId()
    });
  }

  // Revoke permission
  async revokePermission(userId: string, resource: string, action: string) {
    await db.permissions
      .where('userId')
      .equals(userId)
      .and(p => p.resource === resource && p.action === action)
      .delete();
  }

  // Middleware: Permission check
  requirePermission(resource: string, action: string) {
    return async (req: any, res: any, next: any) => {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasPermission = await this.checkPermission(userId, resource, action);

      if (!hasPermission) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    };
  }
}

// Usage: Wrap database operations
class SecureFeatureRepository {
  private permissions: PermissionManager;

  async findById(id: string, userId: string) {
    // Check read permission
    const hasPermission = await this.permissions.checkPermission(
      userId,
      'feature',
      'read'
    );

    if (!hasPermission) {
      throw new Error('Permission denied');
    }

    return await db.features.get(id);
  }

  async update(id: string, data: any, userId: string) {
    // Check update permission
    const hasPermission = await this.permissions.checkPermission(
      userId,
      'feature',
      'update'
    );

    if (!hasPermission) {
      throw new Error('Permission denied');
    }

    // Log audit trail
    await db.auditLog.insert({
      id: generateId(),
      action: 'update',
      table: 'features',
      recordId: id,
      userId,
      timestamp: Date.now(),
      changes: data
    });

    return await db.features.update(id, data);
  }
}
```

---

### 5.3 Testing Strategy

A comprehensive testing strategy ensures code quality and system stability, including unit tests, integration tests, E2E tests, and performance tests.

#### Key Points

- **Unit Tests**: Test independent components and functions
- **Integration Tests**: Test module interactions
- **E2E Tests**: Test complete user flows
- **Performance Tests**: Verify system performance metrics

**Example: Unit Tests**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureRepository', () => {
  let repository: FeatureRepository;
  let testDb: WebGeoDB;

  beforeEach(async () => {
    // Create test database
    testDb = new WebGeoDB({
      name: 'test-db',
      version: 1
    });
    await testDb.open();

    testDb.schema({
      features: {
        id: 'string',
        type: 'string',
        geometry: 'geometry',
        properties: 'json'
      }
    });

    repository = new FeatureRepository(testDb);
  });

  it('should create a feature', async () => {
    const feature = {
      id: 'test-1',
      type: 'Point',
      geometry: {
        type: 'Point',
        coordinates: [116.404, 39.915]
      },
      properties: { name: 'Beijing' }
    };

    await repository.create(feature);

    const retrieved = await repository.findById('test-1');
    expect(retrieved).toEqual(feature);
  });

  it('should find features by type', async () => {
    await repository.create({
      id: 'test-1',
      type: 'restaurant',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {}
    });

    await repository.create({
      id: 'test-2',
      type: 'hotel',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {}
    });

    const restaurants = await repository.findByType('restaurant');
    expect(restaurants).toHaveLength(1);
    expect(restaurants[0].id).toBe('test-1');
  });

  it('should handle errors gracefully', async () => {
    await expect(
      repository.create({ id: null, type: 'invalid' })
    ).rejects.toThrow('Invalid feature data');
  });
});
```

**Example: Integration Tests**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature Integration Tests', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'integration-test-db',
      version: 1
    });
    await db.open();

    db.schema({
      features: {
        id: 'string',
        type: 'string',
        geometry: 'geometry',
        properties: 'json',
        createdAt: 'number'
      },
      auditLog: {
        id: 'string',
        action: 'string',
        table: 'string',
        recordId: 'string',
        timestamp: 'number'
      }
    });
  });

  afterEach(async () => {
    await db.close();
    await db.delete();
  });

  it('should create feature and log audit', async () => {
    const feature = {
      id: 'test-1',
      type: 'Point',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {},
      createdAt: Date.now()
    };

    // Create feature and log in transaction
    await db.transaction('rw', [db.features, db.auditLog], async () => {
      await db.features.insert(feature);

      await db.auditLog.insert({
        id: 'audit-1',
        action: 'create',
        table: 'features',
        recordId: 'test-1',
        timestamp: Date.now()
      });
    });

    // Verify feature created
    const retrievedFeature = await db.features.get('test-1');
    expect(retrievedFeature).toBeDefined();

    // Verify audit log recorded
    const auditLogs = await db.auditLog
      .where('recordId')
      .equals('test-1')
      .toArray();
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe('create');
  });

  it('should rollback on error', async () => {
    try {
      await db.transaction('rw', [db.features, db.auditLog], async () => {
        await db.features.insert({
          id: 'test-1',
          type: 'Point',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: {}
        });

        // Simulate error
        throw new Error('Simulated error');
      });
    } catch (error) {
      // Expected error
    }

    // Verify data not inserted (transaction rolled back)
    const count = await db.features.count();
    expect(count).toBe(0);
  });
});
```

**Example: E2E Tests (with Playwright)**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Map Application E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/map');
  });

  test('should add a feature on map click', async ({ page }) => {
    // Click map to add feature
    await page.locator('#map').click({
      position: { x: 400, y: 300 }
    });

    // Fill form
    await page.fill('[name="name"]', 'New Feature');
    await page.fill('[name="type"]', 'marker');

    // Submit
    await page.click('button:has-text("Add")');

    // Verify feature added
    await expect(page.locator('.feature-marker')).toHaveCount(1);
    await expect(page.locator('.feature-name')).toHaveText('New Feature');
  });

  test('should search for features', async ({ page }) => {
    // Enter search term
    await page.fill('[name="search"]', 'restaurant');

    // Wait for search results
    await page.waitForSelector('.search-results');

    // Verify results
    const results = await page.locator('.search-result').count();
    expect(results).toBeGreaterThan(0);
  });

  test('should handle offline mode', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true);

    // Try to add feature
    await page.locator('#map').click({
      position: { x: 400, y: 300 }
    });

    await page.fill('[name="name"]', 'Offline Feature');
    await page.click('button:has-text("Add")');

    // Verify offline indicator
    await expect(page.locator('.offline-indicator')).toBeVisible();
    await expect(page.locator('.sync-pending')).toBeVisible();

    // Restore online
    await page.context().setOffline(false);

    // Verify sync complete
    await expect(page.locator('.sync-complete')).toBeVisible();
  });
});
```

**Example: Performance Tests**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Performance Tests', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'perf-test-db',
      version: 1
    });
    await db.open();

    db.schema({
      features: {
        id: 'string',
        type: 'string',
        geometry: 'geometry',
        properties: 'json'
      }
    });
  });

  it('should insert 1000 features in less than 1 second', async () => {
    const features = Array.from({ length: 1000 }, (_, i) => ({
      id: `feature-${i}`,
      type: 'Point',
      geometry: {
        type: 'Point',
        coordinates: [
          Math.random() * 360 - 180,
          Math.random() * 180 - 90
        ]
      },
      properties: { index: i }
    }));

    const start = performance.now();
    await db.features.insertMany(features);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000);
    console.log(`Inserted 1000 features in ${duration.toFixed(2)}ms`);
  });

  it('should query spatial index efficiently', async () => {
    // Insert 10000 records
    const features = Array.from({ length: 10000 }, (_, i) => ({
      id: `feature-${i}`,
      type: 'Point',
      geometry: {
        type: 'Point',
        coordinates: [
          Math.random() * 360 - 180,
          Math.random() * 180 - 90
        ]
      },
      properties: {}
    }));

    await db.features.insertMany(features);

    // Create spatial index
    db.features.createIndex('geometry', { type: 'flatbush' });

    // Query nearby features
    const point = { type: 'Point', coordinates: [0, 0] };
    const start = performance.now();

    const results = await db.features
      .distance('geometry', point.coordinates, '<', 1000)
      .limit(100)
      .toArray();

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
    console.log(`Spatial query returned ${results.length} results in ${duration.toFixed(2)}ms`);
  });

  it('should handle concurrent operations', async () => {
    const operations = Array.from({ length: 100 }, (_, i) =>
      db.features.insert({
        id: `concurrent-${i}`,
        type: 'Point',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {}
      })
    );

    const start = performance.now();
    await Promise.all(operations);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(2000);

    const count = await db.features.count();
    expect(count).toBe(100);
  });
});
```

---

### 5.4 Performance Monitoring and Optimization

Continuously monitor application performance, identify and resolve bottlenecks promptly, ensuring good user experience.

#### Key Points

- **Metrics Collection**: Collect key performance metrics
- **Error Monitoring**: Capture and log errors
- **Log Management**: Structured logging
- **Performance Optimization**: Optimize based on data

**Example: Performance Monitoring System**
```typescript
// Performance monitor
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private maxSamples = 100;

  // Record operation duration
  record(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const samples = this.metrics.get(operation)!;
    samples.push(duration);

    // Keep only recent samples
    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  // Get statistics
  getStats(operation: string) {
    const samples = this.metrics.get(operation);
    if (!samples || samples.length === 0) {
      return null;
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const sum = samples.reduce((a, b) => a + b, 0);

    return {
      count: samples.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / samples.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(samples.length * 0.95)],
      p99: sorted[Math.floor(samples.length * 0.99)]
    };
  }

  // Generate report
  generateReport() {
    const report: Record<string, any> = {};

    for (const [operation] of this.metrics) {
      report[operation] = this.getStats(operation);
    }

    return report;
  }
}

// Usage: Wrap database operations
class MonitoredDatabase {
  private monitor: PerformanceMonitor;

  constructor(private db: WebGeoDB) {
    this.monitor = new PerformanceMonitor();
  }

  async features() {
    const start = performance.now();
    try {
      return await this.db.features.toArray();
    } finally {
      const duration = performance.now() - start;
      this.monitor.record('features.getAll', duration);
    }
  }

  async insertFeature(feature: any) {
    const start = performance.now();
    try {
      return await this.db.features.insert(feature);
    } finally {
      const duration = performance.now() - start;
      this.monitor.record('features.insert', duration);
    }
  }

  getPerformanceReport() {
    return this.monitor.generateReport();
  }
}

// Periodically output report
setInterval(() => {
  const report = monitoredDb.getPerformanceReport();
  console.table(report);
}, 60000); // Every minute
```

**Example: Error Monitoring**
```typescript
// Error monitor
class ErrorMonitor {
  private errors: Array<{ error: Error; context: any; timestamp: number }> = [];
  private maxErrors = 100;

  // Capture error
  capture(error: Error, context: any = {}) {
    const errorRecord = {
      error,
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      },
      timestamp: Date.now()
    };

    this.errors.push(errorRecord);

    // Limit error count
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Send to monitoring service
    this.sendToMonitoring(errorRecord);

    // Print error in development
    if (import.meta.env.DEV) {
      console.error('Error captured:', errorRecord);
    }
  }

  // Send to monitoring service (e.g., Sentry)
  private async sendToMonitoring(errorRecord: any) {
    if (window.Sentry) {
      window.Sentry.captureException(errorRecord.error, {
        extra: errorRecord.context
      });
    }

    // Or send to custom endpoint
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorRecord)
      });
    } catch (e) {
      console.error('Failed to send error to monitoring:', e);
    }
  }

  // Get error summary
  getSummary() {
    const summary = this.errors.reduce((acc, record) => {
      const key = record.error.name;
      if (!acc[key]) {
        acc[key] = { count: 0, latest: null };
      }
      acc[key].count++;
      acc[key].latest = record.timestamp;
      return acc;
    }, {} as Record<string, any>);

    return summary;
  }
}

// Global error handling
const errorMonitor = new ErrorMonitor();

window.addEventListener('error', (event) => {
  errorMonitor.capture(event.error, {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorMonitor.capture(new Error(event.reason), {
    type: 'unhandledRejection'
  });
});
```

**Example: Structured Logging**
```typescript
// Log level
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Structured logger
class Logger {
  private logs: Array<{ level: LogLevel; message: string; context: any; timestamp: number }> = [];
  private minLevel: LogLevel = 'info';

  constructor(minLevel?: LogLevel) {
    if (minLevel) {
      this.minLevel = minLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private log(level: LogLevel, message: string, context: any = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = {
      level,
      message,
      context,
      timestamp: Date.now()
    };

    this.logs.push(logEntry);

    // Output to console in development
    if (import.meta.env.DEV) {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](`[${level.toUpperCase()}]`, message, context);
    }

    // Send to log service
    this.sendToLogService(logEntry);
  }

  private async sendToLogService(logEntry: any) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
    } catch (e) {
      // Fail silently
    }
  }

  debug(message: string, context?: any) {
    this.log('debug', message, context);
  }

  info(message: string, context?: any) {
    this.log('info', message, context);
  }

  warn(message: string, context?: any) {
    this.log('warn', message, context);
  }

  error(message: string, context?: any) {
    this.log('error', message, context);
  }

  // Get logs
  getLogs(level?: LogLevel) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return this.logs;
  }
}

// Usage
const logger = new Logger(import.meta.env.MODE === 'production' ? 'info' : 'debug');

logger.info('Application started', { version: '1.0.0' });
logger.debug('Database opened', { name: 'my-db', size: 1024 });
logger.warn('Storage usage high', { usagePercent: 85 });
logger.error('Failed to save data', { error: 'Quota exceeded' });
```

---

### 5.5 Deployment and Maintenance

Create a complete deployment process and maintenance plan to ensure stable application operation.

#### Key Points

- **Build Optimization**: Optimize production builds
- **Backup Strategy**: Regular backup and recovery
- **Disaster Recovery**: Handle system failures

**Example: Build Optimization Configuration**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'webgeodb-core': ['@webgeodb/core'],
          'vendor': ['react', 'react-dom']
        }
      }
    },

    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console
        drop_debugger: true
      }
    },

    // Source map (optional in production)
    sourcemap: false,

    // Chunk size warning
    chunkSizeWarningLimit: 500
  },

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },

  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['@webgeodb/core']
  }
});
```

**Example: Backup System**
```typescript
// Backup manager
class BackupManager {
  private backupInterval: number;

  constructor(backupInterval: number = 60 * 60 * 1000) { // Default 1 hour
    this.backupInterval = backupInterval;
  }

  // Create backup
  async createBackup(): Promise<string> {
    const backup = {
      version: db.version,
      timestamp: Date.now(),
      tables: {}
    };

    // Backup all tables
    for (const tableName of Object.keys(db.tables)) {
      backup.tables[tableName] = await db[tableName].toArray();
    }

    // Convert to JSON
    const json = JSON.stringify(backup);

    // Compress (optional)
    const compressed = this.compress(json);

    // Save to Blob
    const blob = new Blob([compressed], { type: 'application/json' });

    // Upload to server or local storage
    const backupId = await this.uploadBackup(blob);

    console.log(`Backup created: ${backupId}`);
    return backupId;
  }

  // Compress data
  private compress(data: string): string {
    // Simple implementation: real projects may use pako or similar
    return data;
  }

  // Upload backup
  private async uploadBackup(blob: Blob): Promise<string> {
    // Upload to server
    const formData = new FormData();
    formData.append('backup', blob, `backup-${Date.now()}.json`);

    const response = await fetch('/api/backups', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    return result.backupId;
  }

  // Restore backup
  async restoreBackup(backupId: string) {
    // Download backup
    const response = await fetch(`/api/backups/${backupId}`);
    const backup = await response.json();

    // Verify version
    if (backup.version !== db.version) {
      throw new Error(`Version mismatch: expected ${db.version}, got ${backup.version}`);
    }

    // Restore data
    await db.transaction('rw', Object.keys(backup.tables), async () => {
      for (const [tableName, data] of Object.entries(backup.tables)) {
        await db[tableName].clear();
        await db[tableName].insertMany(data as any[]);
      }
    });

    console.log(`Backup restored: ${backupId}`);
  }

  // Auto backup
  startAutoBackup() {
    setInterval(() => {
      this.createBackup().catch(error => {
        console.error('Auto backup failed:', error);
      });
    }, this.backupInterval);
  }

  // Cleanup old backups
  async cleanupOldBackups(retentionDays: number = 30) {
    const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const response = await fetch(`/api/backups/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cutoffDate })
    });

    const result = await response.json();
    console.log(`Cleaned up ${result.deletedCount} old backups`);
  }
}

// Usage
const backupManager = new BackupManager(60 * 60 * 1000); // 1 hour
backupManager.startAutoBackup();
```

**Example: Disaster Recovery**
```typescript
// Health check
class HealthChecker {
  private checks: Map<string, () => Promise<boolean>> = new Map();

  // Register check
  register(name: string, check: () => Promise<boolean>) {
    this.checks.set(name, check);
  }

  // Run all checks
  async checkAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, check] of this.checks) {
      try {
        results[name] = await check();
      } catch (error) {
        console.error(`Health check "${name}" failed:`, error);
        results[name] = false;
      }
    }

    return results;
  }

  // Get health status
  async isHealthy(): Promise<boolean> {
    const results = await this.checkAll();
    return Object.values(results).every(result => result);
  }
}

// Create health checker
const healthChecker = new HealthChecker();

// Register checks
healthChecker.register('database', async () => {
  try {
    await db.features.count();
    return true;
  } catch {
    return false;
  }
});

healthChecker.register('storage', async () => {
  if (!navigator.storage || !navigator.storage.estimate) {
    return false;
  }

  const estimate = await navigator.storage.estimate();
  const usagePercent = (estimate.usage || 0) / (estimate.quota || 1);

  return usagePercent < 0.95;
});

healthChecker.register('memory', async () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const usagePercent = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    return usagePercent < 0.9;
  }
  return true;
});

// Periodic health checks
setInterval(async () => {
  const health = await healthChecker.checkAll();

  if (!Object.values(health).every(result => result)) {
    console.error('Health check failed:', health);

    // Send alert
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'health_check_failed',
        data: health,
        timestamp: Date.now()
      })
    });
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

---

### 5.6 Troubleshooting

Quickly diagnose and resolve production issues to minimize downtime.

#### Key Points

- **Common Issues**: Identify and resolve common problems
- **Debugging Tools**: Use browser developer tools
- **Log Analysis**: Analyze logs to find root causes

**Common Issue Diagnosis Checklist**

| Symptom | Possible Cause | Diagnostic Steps | Solution |
|---------|---------------|------------------|----------|
| Database won't open | Browser not supported | Check `window.indexedDB` | Implement fallback |
| Query returns empty | Data not inserted | Check table data count | Verify insert logic |
| Slow queries | Missing index | Check query plan | Create spatial index |
| Storage quota full | Too much data | Check storage usage | Clean old data |
| Memory leak | Unclosed connection | Check DB instances | Ensure connection closed |
| Data out of sync | Multi-tab conflict | Check storage events | Implement sync mechanism |

**Example: Diagnostic Tools**
```typescript
// Diagnostic tool
class DiagnosticTool {
  // Comprehensive diagnosis
  async diagnose(): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
      timestamp: Date.now(),
      checks: {}
    };

    // Browser support
    report.checks.browserSupport = this.checkBrowserSupport();

    // Database status
    report.checks.database = await this.checkDatabase();

    // Storage status
    report.checks.storage = await this.checkStorage();

    // Memory usage
    report.checks.memory = this.checkMemory();

    // Performance metrics
    report.checks.performance = await this.checkPerformance();

    return report;
  }

  // Check browser support
  checkBrowserSupport() {
    return {
      indexedDB: !!window.indexedDB,
      storage: !!navigator.storage,
      webWorker: !!window.Worker,
      serviceWorker: 'serviceWorker' in navigator
    };
  }

  // Check database status
  async checkDatabase() {
    try {
      const tables = Object.keys(db.tables);
      const counts: Record<string, number> = {};

      for (const table of tables) {
        counts[table] = await db[table].count();
      }

      return {
        status: 'ok',
        version: db.version,
        tables,
        counts
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  // Check storage status
  async checkStorage() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { status: 'unsupported' };
    }

    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 1;
    const usagePercent = (usage / quota) * 100;

    return {
      usageMB: (usage / 1024 / 1024).toFixed(2),
      quotaMB: (quota / 1024 / 1024).toFixed(2),
      usagePercent: usagePercent.toFixed(2),
      status: usagePercent > 90 ? 'critical' : usagePercent > 75 ? 'warning' : 'ok'
    };
  }

  // Check memory usage
  checkMemory() {
    if (!('memory' in performance)) {
      return { status: 'unsupported' };
    }

    const memory = (performance as any).memory;
    const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      usedMB: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
      totalMB: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
      usagePercent: usagePercent.toFixed(2),
      status: usagePercent > 90 ? 'critical' : usagePercent > 75 ? 'warning' : 'ok'
    };
  }

  // Check performance
  async checkPerformance() {
    const metrics = await this.runPerformanceTests();

    return {
      insert: metrics.insert,
      query: metrics.query,
      status: metrics.insert < 100 && metrics.query < 50 ? 'ok' : 'slow'
    };
  }

  // Run performance tests
  async runPerformanceTests() {
    const testFeature = {
      id: 'test-perf',
      type: 'Point',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {}
    };

    // Test insert
    const insertStart = performance.now();
    await db.features.put(testFeature);
    const insertTime = performance.now() - insertStart;

    // Test query
    const queryStart = performance.now();
    await db.features.get('test-perf');
    const queryTime = performance.now() - queryStart;

    // Cleanup
    await db.features.delete('test-perf');

    return {
      insert: insertTime.toFixed(2),
      query: queryTime.toFixed(2)
    };
  }
}

interface DiagnosticReport {
  timestamp: number;
  checks: {
    browserSupport?: any;
    database?: any;
    storage?: any;
    memory?: any;
    performance?: any;
  };
}

// Usage
const diagnostic = new DiagnosticTool();

// Run diagnostics in console
(window as any).runDiagnostics = async () => {
  const report = await diagnostic.diagnose();
  console.table(report.checks);
  return report;
};

// Auto-run on errors
window.addEventListener('error', async () => {
  const report = await diagnostic.diagnose();

  // Send diagnostic report
  await fetch('/api/diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  });
});
```

---

## Practice Exercise

### Scenario: Enterprise GIS Platform

Build an enterprise-grade GIS platform with permission management, audit logging, and automatic backup.

#### Requirements

1. Implement role-based permission management system
2. Record audit logs for all data changes
3. Configure automatic backup and disaster recovery
4. Implement comprehensive error and performance monitoring
5. Create production environment checklist

#### Implementation Steps

<details>
<summary>View Implementation Steps</summary>

1. **Step 1**: Set up permission management system
   ```typescript
   // Permission definition
   interface Permission {
     id: string;
     role: string;
     resource: string;
     action: 'read' | 'create' | 'update' | 'delete';
     granted: boolean;
   }

   // Role definition
   interface Role {
     id: string;
     name: string;
     permissions: string[];
   }

   // Permission manager
   class RBACManager {
     async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
       // Get user role
       const user = await db.users.get(userId);
       if (!user) return false;

       // Check role permissions
       const permissions = await db.permissions
         .where('role')
         .equals(user.role)
         .and(p => p.resource === resource && p.action === action)
         .toArray();

       return permissions.some(p => p.granted);
     }

     async grantPermission(roleId: string, resource: string, action: string) {
       await db.permissions.put({
         id: `${roleId}:${resource}:${action}`,
         role: roleId,
         resource,
         action,
         granted: true,
         grantedAt: Date.now()
       });
     }
   }

   // Initialize permissions
   async function initializePermissions() {
     await db.permissions.put({
       id: 'admin:all:*',
       role: 'admin',
       resource: 'all',
       action: '*',
       granted: true
     });

     await db.permissions.put({
       id: 'editor:features:read',
       role: 'editor',
       resource: 'features',
       action: 'read',
       granted: true
     });

     await db.permissions.put({
       id: 'editor:features:create',
       role: 'editor',
       resource: 'features',
       action: 'create',
       granted: true
     });
   }
   ```

2. **Step 2**: Implement audit logging system
   ```typescript
   // Audit log interface
   interface AuditLog {
     id: string;
     userId: string;
     action: string;
     resource: string;
     resourceId: string;
     changes: any;
     timestamp: number;
     ip?: string;
     userAgent?: string;
   }

   // Audit log manager
   class AuditLogger {
     async log(action: string, resource: string, resourceId: string, changes: any) {
       const user = getCurrentUser();

       await db.auditLog.insert({
         id: generateId(),
         userId: user.id,
         action,
         resource,
         resourceId,
         changes,
         timestamp: Date.now(),
         ip: await getClientIP(),
         userAgent: navigator.userAgent
       });
     }

     async getAuditHistory(resourceId: string) {
       return await db.auditLog
         .where('resourceId')
         .equals(resourceId)
         .reverse()
         .limit(100)
         .toArray();
     }
   }

   // Log audit in database operations
   const auditLogger = new AuditLogger();

   async function updateFeature(id: string, data: any) {
     const old = await db.features.get(id);

     await db.transaction('rw', [db.features, db.auditLog], async () => {
       await db.features.update(id, data);

       await auditLogger.log(
         'update',
         'features',
         id,
         { old, new: data }
       );
     });
   }
   ```

3. **Step 3**: Configure automatic backup
   ```typescript
   // Backup configuration
   const backupConfig = {
     interval: 60 * 60 * 1000, // 1 hour
     retention: 30, // 30 days
     compression: true
   };

   // Create backup manager
   const backupManager = new BackupManager(backupConfig.interval);

   // Start automatic backup
   backupManager.startAutoBackup();

   // Cleanup old backups daily
   setInterval(() => {
     backupManager.cleanupOldBackups(backupConfig.retention);
   }, 24 * 60 * 60 * 1000);

   // Upload backup to server
   async function uploadBackupToServer(backupData: any) {
     const response = await fetch('/api/backups', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${getAuthToken()}`
       },
       body: JSON.stringify(backupData)
     });

     if (!response.ok) {
       throw new Error('Backup upload failed');
     }

     return await response.json();
   }
   ```

4. **Step 4**: Implement monitoring
   ```typescript
   // Combined monitoring system
   class ProductionMonitor {
     private performanceMonitor: PerformanceMonitor;
     private errorMonitor: ErrorMonitor;
     private logger: Logger;
     private healthChecker: HealthChecker;

     constructor() {
       this.performanceMonitor = new PerformanceMonitor();
       this.errorMonitor = new ErrorMonitor();
       this.logger = new Logger('info');
       this.healthChecker = new HealthChecker();
     }

     async start() {
       // Performance monitoring
       this.performanceMonitor.start();

       // Health checks
       setInterval(async () => {
         const health = await this.healthChecker.checkAll();
         this.logger.info('Health check', health);

         if (!Object.values(health).every(result => result)) {
           this.sendAlert('Health check failed', health);
         }
       }, 5 * 60 * 1000);

       // Error monitoring
       window.addEventListener('error', (e) => {
         this.errorMonitor.capture(e.error);
       });

       window.addEventListener('unhandledrejection', (e) => {
         this.errorMonitor.capture(new Error(e.reason));
       });
     }

     private async sendAlert(message: string, data: any) {
       await fetch('/api/alerts', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ message, data, timestamp: Date.now() })
       });
     }
   }

   // Start monitoring
   const monitor = new ProductionMonitor();
   await monitor.start();
   ```

5. **Step 5**: Create production checklist
   ```typescript
   // Production environment checklist
   const productionChecklist = {
     // Configuration checks
     config: [
       'Environment variables configured correctly',
       'API endpoints point to production',
       'Debug mode disabled',
       'Error reporting configured'
     ],

     // Security checks
     security: [
       'All user input validated',
       'Sensitive data encrypted',
       'Permission system enabled',
       'HTTPS enabled',
       'CORS configured correctly'
     ],

     // Performance checks
     performance: [
       'Code minified and obfuscated',
       'Resources split and lazy-loaded',
       'Cache strategy configured',
       'CDN configured',
       'Spatial indexes created'
     ],

     // Monitoring checks
     monitoring: [
       'Performance monitoring enabled',
       'Error monitoring enabled',
       'Logging configured',
       'Health checks configured',
       'Alert system configured'
     ],

     // Backup checks
     backup: [
       'Automatic backup enabled',
       'Backup restore tested',
       'Backup retention configured',
       'Disaster recovery plan created'
     ],

     // Testing checks
     testing: [
       'Unit test coverage > 80%',
       'Integration tests passed',
       'E2E tests passed',
       'Performance tests passed',
       'Security tests passed'
     ]
   };

   // Run checks
   async function runProductionChecks() {
     console.log('🚀 Running production checks...');

     for (const [category, checks] of Object.entries(productionChecklist)) {
       console.log(`\n📋 ${category.toUpperCase()}:`);

       for (const check of checks) {
         console.log(`  ✓ ${check}`);
       }
     }

     console.log('\n✅ All production checks completed!');
   }
   ```

</details>

#### Testing

```typescript
// Test permission system
describe('RBAC System', () => {
  it('should enforce permissions', async () => {
    const rbac = new RBACManager();

    // Create test user
    await db.users.put({
      id: 'user1',
      role: 'viewer'
    });

    // Check permissions
    const canRead = await rbac.hasPermission('user1', 'features', 'read');
    const canDelete = await rbac.hasPermission('user1', 'features', 'delete');

    expect(canRead).toBe(true);
    expect(canDelete).toBe(false);
  });
});

// Test audit logging
describe('Audit Logging', () => {
  it('should log all changes', async () => {
    await updateFeature('test-1', { name: 'Updated' });

    const logs = await db.auditLog
      .where('resourceId')
      .equals('test-1')
      .toArray();

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('update');
  });
});

// Test backup and restore
describe('Backup & Restore', () => {
  it('should backup and restore data', async () => {
    // Create backup
    const backupId = await backupManager.createBackup();

    // Modify data
    await db.features.put({
      id: 'test-1',
      name: 'Modified'
    });

    // Restore backup
    await backupManager.restoreBackup(backupId);

    // Verify data restored
    const restored = await db.features.get('test-1');
    expect(restored.name).not.toBe('Modified');
  });
});
```

#### Answer Reference

<details>
<summary>View Complete Answer</summary>

```typescript
// Complete enterprise GIS platform implementation

// 1. Initialize database
async function initializeEnterpriseDB() {
  const db = new WebGeoDB({
    name: 'enterprise-gis',
    version: 1,
    upgrade: () => {
      db.schema({
        users: {
          id: 'string',
          username: 'string',
          email: 'string',
          role: 'string',
          createdAt: 'number'
        },
        roles: {
          id: 'string',
          name: 'string',
          description: 'string'
        },
        permissions: {
          id: 'string',
          role: 'string',
          resource: 'string',
          action: 'string',
          granted: 'boolean'
        },
        features: {
          id: 'string',
          type: 'string',
          geometry: 'geometry',
          properties: 'json',
          createdAt: 'number',
          updatedAt: 'number',
          createdBy: 'string'
        },
        auditLog: {
          id: 'string',
          userId: 'string',
          action: 'string',
          resource: 'string',
          resourceId: 'string',
          changes: 'json',
          timestamp: 'number'
        }
      });
    }
  });

  await db.open();

  // Initialize roles and permissions
  await initializeRolesAndPermissions();

  return db;
}

// 2. Create complete monitoring system
const monitor = new ProductionMonitor();

// 3. Configure automatic backup
const backupManager = new BackupManager(60 * 60 * 1000);
backupManager.startAutoBackup();

// 4. Start application
async function startApplication() {
  // Run production checks
  await runProductionChecks();

  // Start monitoring
  await monitor.start();

  // Check database health
  const healthy = await healthChecker.isHealthy();

  if (!healthy) {
    console.error('System unhealthy, aborting startup');
    return;
  }

  console.log('✅ Enterprise GIS Platform started successfully');
}

startApplication();
```

</details>

---

## FAQ

### Q: How to handle data synchronization across multiple tabs?

**A:** Use `storage` event to listen for changes in other tabs and reload data after changes.

```typescript
// Listen for changes from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'webgeodb-change') {
    console.log('Data changed in another tab');
    reloadData();
  }
});

// Notify other tabs after changes
async function notifyChange() {
  localStorage.setItem('webgeodb-change', Date.now().toString());
  localStorage.removeItem('webgeodb-change');
}
```

### Q: How to optimize insert performance for large datasets?

**A:** Use batch insert, disable indexes, process in chunks.

```typescript
// Batch insert
await db.features.insertMany(largeDataset);

// Process in chunks
const batchSize = 1000;
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  await db.features.insertMany(batch);
}
```

### Q: How to implement database version upgrades?

**A:** Use `upgrade` callback to handle version upgrades, supporting upgrades from any old version.

```typescript
const db = new WebGeoDB({
  name: 'my-db',
  version: 3,
  upgrade: (oldVersion, newVersion) => {
    if (oldVersion < 1) {
      // Create initial tables
    }
    if (oldVersion < 2) {
      // Add new fields
    }
    if (oldVersion < 3) {
      // Add new tables
    }
  }
});
```

### Q: How to monitor production errors?

**A:** Integrate error monitoring services (e.g., Sentry) or implement custom error reporting.

```typescript
// Global error capture
window.addEventListener('error', (e) => {
  const errorData = {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    stack: e.error?.stack,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorData)
  });
});
```

---

## Summary

This chapter covered deploying WebGeoDB applications to production environments, including configuration management, security protection, testing strategies, performance monitoring, backup recovery, and troubleshooting.

### Key Points Review

- ✅ Implement complete version management and environment configuration
- ✅ Establish multi-layer security protection system
- ✅ Build comprehensive testing strategy (unit, integration, E2E, performance)
- ✅ Implement continuous performance and error monitoring
- ✅ Create reliable backup and disaster recovery plans
- ✅ Master quick diagnosis and problem-solving methods

### Production Environment Checklist

#### Pre-deployment Checks

- [ ] Environment variables configured correctly
- [ ] All debug code removed
- [ ] Code minified and optimized
- [ ] Security audit passed
- [ ] Test coverage > 80%

#### Security Checks

- [ ] Input validation implemented
- [ ] XSS protection enabled
- [ ] Sensitive data encrypted
- [ ] Permission system configured
- [ ] HTTPS enabled

#### Monitoring Checks

- [ ] Performance monitoring enabled
- [ ] Error monitoring enabled
- [ ] Logging system configured
- [ ] Alert rules set up
- [ ] Health checks configured

#### Backup Checks

- [ ] Automatic backup enabled
- [ ] Backup restore tested
- [ ] Retention policy configured
- [ ] Off-site backup configured

### Next Steps

- **[Chapter 6: Advanced Topics](../en/chapter-06-advanced-topics.md)** - Learn plugin system, extension APIs, performance tuning
- **[API Reference](../../api/reference.md)** - View complete API documentation
- **[Practice Examples](../../examples/enterprise-platform/)** - View enterprise platform complete code

---

## References

### Official Documentation

- **[WebGeoDB Documentation](../../)** - Complete project documentation
- **[API Reference](../../api/reference.md)** - Detailed API documentation
- **[Best Practices](../../guides/best-practices.md)** - Development best practices
- **[Troubleshooting](../../guides/troubleshooting.md)** - Problem-solving guide

### Related Resources

- **[IndexedDB Specification](https://w3c.github.io/IndexedDB/)** - W3C official specification
- **[Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)** - Data encryption
- **[Progressive Web App](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)** - PWA guide

### Recommended Tools

- **[Vitest](https://vitest.dev/)** - Unit testing framework
- **[Playwright](https://playwright.dev/)** - E2E testing framework
- **[Sentry](https://sentry.io/)** - Error monitoring
- **[Lighthouse](https://developer.chrome.com/docs/lighthouse/overview)** - Performance analysis
