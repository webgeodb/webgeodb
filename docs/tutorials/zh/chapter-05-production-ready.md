# 第5章: 生产环境最佳实践

> **学习时间**: 60-90分钟 | **先决条件**: 第1-4章

## 学习目标

通过本章学习，你将能够：
- 配置生产环境的 WebGeoDB 应用
- 实施全面的安全防护措施
- 建立完整的测试策略
- 监控应用性能和错误
- 制定备份和灾难恢复方案
- 快速诊断和解决生产问题

---

## 核心概念

### 5.1 生产环境配置

生产环境配置是确保应用稳定、安全、高效运行的基础。主要包括版本管理、环境变量管理和存储配额管理。

#### 关键要点

- **版本管理**：使用语义化版本号，平滑升级数据库结构
- **环境变量**：区分开发和生产环境配置
- **存储配额**：监控和管理浏览器存储使用情况

**示例代码：数据库版本管理**
```typescript
import { WebGeoDB } from '@webgeodb/core';

// 定义数据库版本
const DB_VERSION = 2;
const DB_NAME = 'enterprise-gis-platform';

// 数据库配置
const dbConfig = {
  name: DB_NAME,
  version: DB_VERSION,

  // 版本升级处理
  upgrade: (oldVersion, newVersion, transaction) => {
    console.log(`Upgrading from v${oldVersion} to v${newVersion}`);

    if (oldVersion < 1) {
      // 初始化表结构
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
      // 添加权限管理表
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

  // 版本冲突处理
  blocked: () => {
    console.error('Database version conflict detected');
    // 通知用户关闭其他标签页
    alert('检测到数据库版本冲突。请关闭其他标签页后刷新页面。');
  },

  blocking: () => {
    console.log('Current tab is blocking upgrade');
    // 通知用户当前标签页需要关闭
  }
};

const db = new WebGeoDB(dbConfig);
```

**输出:**
```
Upgrading from v1 to v2
Database opened successfully
```

> **💡 提示:** 始终在升级脚本中处理所有历史版本，而不是只处理相邻版本。这确保从任何旧版本升级都能正常工作。

**示例代码：环境变量管理**
```typescript
// 环境配置
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
      backupInterval: 5 * 60 * 1000 // 5分钟
    },
    staging: {
      env: 'staging',
      apiEndpoint: 'https://staging-api.example.com',
      maxStorageMB: 200,
      enableDebugMode: true,
      backupInterval: 15 * 60 * 1000 // 15分钟
    },
    production: {
      env: 'production',
      apiEndpoint: 'https://api.example.com',
      maxStorageMB: 500,
      enableDebugMode: false,
      backupInterval: 60 * 60 * 1000 // 1小时
    }
  };

  return configs[env] || configs.development;
}

const config = getConfig();
console.log(`Running in ${config.env} mode`);
```

**示例代码：存储配额监控**
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
    // 通知用户或自动清理
    this.cleanupOldData();
  }

  private handleCriticalStorage(status: any) {
    console.error('Storage critical:', status);
    alert('存储空间不足。请清理旧数据或联系管理员。');
  }

  private async cleanupOldData() {
    const cutoffDate = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30天前

    await db.transaction('rw', [db.features, db.auditLog], async () => {
      // 删除旧数据
      await db.features
        .where('createdAt', '<', cutoffDate)
        .delete();

      // 删除旧日志
      await db.auditLog
        .where('timestamp', '<', cutoffDate)
        .delete();
    });
  }
}

// 使用
const storageManager = new StorageManager();
setInterval(() => storageManager.checkStorage(), 60000); // 每分钟检查
```

---

### 5.2 安全性

生产环境必须实施全面的安全防护措施，包括输入验证、XSS防护、数据加密和权限管理。

#### 关键要点

- **输入验证**：严格验证所有用户输入
- **XSS防护**：转义所有动态内容
- **数据加密**：加密敏感数据
- **权限管理**：实施细粒度访问控制

**示例代码：输入验证**
```typescript
import { Geometry } from 'geojson';

// 数据验证器
class DataValidator {
  // 验证要素数据
  validateFeature(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必需字段
    if (!data.id || typeof data.id !== 'string') {
      errors.push('ID is required and must be a string');
    }

    if (!data.type || typeof data.type !== 'string') {
      errors.push('Type is required and must be a string');
    }

    // 验证几何数据
    if (!this.validateGeometry(data.geometry)) {
      errors.push('Invalid geometry data');
    }

    // 验证属性
    if (data.properties && typeof data.properties !== 'object') {
      errors.push('Properties must be an object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // 验证几何数据
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

    // 验证坐标范围（经度: -180 到 180，纬度: -90 到 90）
    return this.validateCoordinates(geometry.coordinates, geometry.type);
  }

  // 验证坐标
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

  // 验证用户输入（防止SQL注入、NoSQL注入等）
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // 移除可能的HTML标签
      .replace(/['";]/g, '') // 移除可能的注入字符
      .trim();
  }
}

// 使用
const validator = new DataValidator();

async function insertFeature(data: any) {
  const validation = validator.validateFeature(data);

  if (!validation.valid) {
    throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
  }

  // 安全地插入数据
  await db.features.insert(data);
}
```

**示例代码：XSS防护**
```typescript
// HTML转义工具
class XSSProtection {
  // 转义HTML特殊字符
  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 安全地设置HTML内容
  setSafeHtml(element: HTMLElement, content: string) {
    element.textContent = content;
  }

  // 安全地创建DOM元素
  createSafeElement(tag: string, text: string): HTMLElement {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  }

  // 验证URL
  isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}

// 使用
const xss = new XSSProtection();

// ❌ 危险：直接使用用户输入
element.innerHTML = `<div>${userInput}</div>`;

// ✅ 安全：转义后使用
element.innerHTML = `<div>${xss.escapeHtml(userInput)}</div>`;

// ✅ 更安全：使用textContent
element.textContent = userInput;
```

**示例代码：数据加密**
```typescript
// 数据加密工具
class DataEncryption {
  private algorithm = 'AES-GCM';
  private keyLength = 256;

  // 生成加密密钥
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

  // 加密数据
  async encrypt(data: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
      { name: this.algorithm, iv },
      key,
      encoder.encode(data)
    );

    // 组合IV和加密数据
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  // 解密数据
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

// 使用：加密敏感字段
async function saveSensitiveFeature(feature: any) {
  const encryption = new DataEncryption();
  const key = await encryption.generateKey(getEncryptionKey());

  // 加密敏感属性
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

**示例代码：权限管理**
```typescript
// 权限管理系统
class PermissionManager {
  // 检查权限
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const permission = await db.permissions
      .where('userId')
      .equals(userId)
      .and(p => p.resource === resource && p.action === action)
      .first();

    return permission?.granted || false;
  }

  // 授予权限
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

  // 撤销权限
  async revokePermission(userId: string, resource: string, action: string) {
    await db.permissions
      .where('userId')
      .equals(userId)
      .and(p => p.resource === resource && p.action === action)
      .delete();
  }

  // 中间件：权限检查
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

// 使用：包装数据库操作
class SecureFeatureRepository {
  private permissions: PermissionManager;

  async findById(id: string, userId: string) {
    // 检查读取权限
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
    // 检查更新权限
    const hasPermission = await this.permissions.checkPermission(
      userId,
      'feature',
      'update'
    );

    if (!hasPermission) {
      throw new Error('Permission denied');
    }

    // 记录审计日志
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

### 5.3 测试策略

完整的测试策略确保代码质量和系统稳定性，包括单元测试、集成测试、E2E测试和性能测试。

#### 关键要点

- **单元测试**：测试独立组件和函数
- **集成测试**：测试模块间交互
- **E2E测试**：测试完整用户流程
- **性能测试**：验证系统性能指标

**示例代码：单元测试**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureRepository', () => {
  let repository: FeatureRepository;
  let testDb: WebGeoDB;

  beforeEach(async () => {
    // 创建测试数据库
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

**示例代码：集成测试**
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

    // 在事务中创建要素和日志
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

    // 验证要素已创建
    const retrievedFeature = await db.features.get('test-1');
    expect(retrievedFeature).toBeDefined();

    // 验证审计日志已记录
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

        // 模拟错误
        throw new Error('Simulated error');
      });
    } catch (error) {
      // 预期的错误
    }

    // 验证数据未插入（事务回滚）
    const count = await db.features.count();
    expect(count).toBe(0);
  });
});
```

**示例代码：E2E测试（使用Playwright）**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Map Application E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/map');
  });

  test('should add a feature on map click', async ({ page }) => {
    // 点击地图添加要素
    await page.locator('#map').click({
      position: { x: 400, y: 300 }
    });

    // 填写表单
    await page.fill('[name="name"]', 'New Feature');
    await page.fill('[name="type"]', 'marker');

    // 提交
    await page.click('button:has-text("Add")');

    // 验证要素已添加
    await expect(page.locator('.feature-marker')).toHaveCount(1);
    await expect(page.locator('.feature-name')).toHaveText('New Feature');
  });

  test('should search for features', async ({ page }) => {
    // 输入搜索关键词
    await page.fill('[name="search"]', 'restaurant');

    // 等待搜索结果
    await page.waitForSelector('.search-results');

    // 验证结果
    const results = await page.locator('.search-result').count();
    expect(results).toBeGreaterThan(0);
  });

  test('should handle offline mode', async ({ page }) => {
    // 模拟离线
    await page.context().setOffline(true);

    // 尝试添加要素
    await page.locator('#map').click({
      position: { x: 400, y: 300 }
    });

    await page.fill('[name="name"]', 'Offline Feature');
    await page.click('button:has-text("Add")');

    // 验证离线提示
    await expect(page.locator('.offline-indicator')).toBeVisible();
    await expect(page.locator('.sync-pending')).toBeVisible();

    // 恢复在线
    await page.context().setOffline(false);

    // 验证同步完成
    await expect(page.locator('.sync-complete')).toBeVisible();
  });
});
```

**示例代码：性能测试**
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
    // 插入10000条数据
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

    // 创建空间索引
    db.features.createIndex('geometry', { type: 'flatbush' });

    // 查询附近要素
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

### 5.4 性能监控和优化

持续监控应用性能，及时发现和解决瓶颈，确保良好的用户体验。

#### 关键要点

- **指标采集**：收集关键性能指标
- **错误监控**：捕获和记录错误
- **日志管理**：结构化日志记录
- **性能优化**：基于数据优化

**示例代码：性能监控系统**
```typescript
// 性能监控器
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private maxSamples = 100;

  // 记录操作耗时
  record(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const samples = this.metrics.get(operation)!;
    samples.push(duration);

    // 只保留最近的样本
    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  // 获取统计信息
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
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  // 生成报告
  generateReport() {
    const report: Record<string, any> = {};

    for (const [operation] of this.metrics) {
      report[operation] = this.getStats(operation);
    }

    return report;
  }
}

// 使用：包装数据库操作
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

// 定期输出报告
setInterval(() => {
  const report = monitoredDb.getPerformanceReport();
  console.table(report);
}, 60000); // 每分钟
```

**示例代码：错误监控**
```typescript
// 错误监控器
class ErrorMonitor {
  private errors: Array<{ error: Error; context: any; timestamp: number }> = [];
  private maxErrors = 100;

  // 捕获错误
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

    // 限制错误数量
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // 发送到监控服务
    this.sendToMonitoring(errorRecord);

    // 在开发环境打印错误
    if (import.meta.env.DEV) {
      console.error('Error captured:', errorRecord);
    }
  }

  // 发送到监控服务（如Sentry）
  private async sendToMonitoring(errorRecord: any) {
    if (window.Sentry) {
      window.Sentry.captureException(errorRecord.error, {
        extra: errorRecord.context
      });
    }

    // 或发送到自定义端点
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

  // 获取错误摘要
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

// 全局错误处理
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

**示例代码：结构化日志**
```typescript
// 日志级别
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 结构化日志器
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

    // 在开发环境输出到控制台
    if (import.meta.env.DEV) {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](`[${level.toUpperCase()}]`, message, context);
    }

    // 发送到日志服务
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
      // 静默失败
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

  // 获取日志
  getLogs(level?: LogLevel) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return this.logs;
  }
}

// 使用
const logger = new Logger(import.meta.env.MODE === 'production' ? 'info' : 'debug');

logger.info('Application started', { version: '1.0.0' });
logger.debug('Database opened', { name: 'my-db', size: 1024 });
logger.warn('Storage usage high', { usagePercent: 85 });
logger.error('Failed to save data', { error: 'Quota exceeded' });
```

---

### 5.5 部署和维护

制定完整的部署流程和维护计划，确保应用稳定运行。

#### 关键要点

- **构建优化**：优化生产构建
- **备份策略**：定期备份和恢复
- **灾难恢复**：应对系统故障

**示例代码：构建优化配置**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          'webgeodb-core': ['@webgeodb/core'],
          'vendor': ['react', 'react-dom']
        }
      }
    },

    // 压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除console
        drop_debugger: true
      }
    },

    // Source map（生产环境可选）
    sourcemap: false,

    // Chunk大小警告
    chunkSizeWarningLimit: 500
  },

  // 环境变量
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },

  // 优化依赖预构建
  optimizeDeps: {
    include: ['@webgeodb/core']
  }
});
```

**示例代码：备份系统**
```typescript
// 备份管理器
class BackupManager {
  private backupInterval: number;

  constructor(backupInterval: number = 60 * 60 * 1000) { // 默认1小时
    this.backupInterval = backupInterval;
  }

  // 创建备份
  async createBackup(): Promise<string> {
    const backup = {
      version: db.version,
      timestamp: Date.now(),
      tables: {}
    };

    // 备份所有表
    for (const tableName of Object.keys(db.tables)) {
      backup.tables[tableName] = await db[tableName].toArray();
    }

    // 转换为JSON
    const json = JSON.stringify(backup);

    // 压缩（可选）
    const compressed = this.compress(json);

    // 保存到Blob
    const blob = new Blob([compressed], { type: 'application/json' });

    // 上传到服务器或本地存储
    const backupId = await this.uploadBackup(blob);

    console.log(`Backup created: ${backupId}`);
    return backupId;
  }

  // 压缩数据
  private compress(data: string): string {
    // 简单实现：实际项目中可能使用pako等库
    return data;
  }

  // 上传备份
  private async uploadBackup(blob: Blob): Promise<string> {
    // 上传到服务器
    const formData = new FormData();
    formData.append('backup', blob, `backup-${Date.now()}.json`);

    const response = await fetch('/api/backups', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    return result.backupId;
  }

  // 恢复备份
  async restoreBackup(backupId: string) {
    // 下载备份
    const response = await fetch(`/api/backups/${backupId}`);
    const backup = await response.json();

    // 验证版本
    if (backup.version !== db.version) {
      throw new Error(`Version mismatch: expected ${db.version}, got ${backup.version}`);
    }

    // 恢复数据
    await db.transaction('rw', Object.keys(backup.tables), async () => {
      for (const [tableName, data] of Object.entries(backup.tables)) {
        await db[tableName].clear();
        await db[tableName].insertMany(data as any[]);
      }
    });

    console.log(`Backup restored: ${backupId}`);
  }

  // 自动备份
  startAutoBackup() {
    setInterval(() => {
      this.createBackup().catch(error => {
        console.error('Auto backup failed:', error);
      });
    }, this.backupInterval);
  }

  // 清理旧备份
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

// 使用
const backupManager = new BackupManager(60 * 60 * 1000); // 1小时
backupManager.startAutoBackup();
```

**示例代码：灾难恢复**
```typescript
// 健康检查
class HealthChecker {
  private checks: Map<string, () => Promise<boolean>> = new Map();

  // 注册检查项
  register(name: string, check: () => Promise<boolean>) {
    this.checks.set(name, check);
  }

  // 执行所有检查
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

  // 获取健康状态
  async isHealthy(): Promise<boolean> {
    const results = await this.checkAll();
    return Object.values(results).every(result => result);
  }
}

// 创建健康检查器
const healthChecker = new HealthChecker();

// 注册检查项
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

// 定期健康检查
setInterval(async () => {
  const health = await healthChecker.checkAll();

  if (!Object.values(health).every(result => result)) {
    console.error('Health check failed:', health);

    // 发送告警
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
}, 5 * 60 * 1000); // 每5分钟
```

---

### 5.6 故障排查

快速诊断和解决生产问题，减少停机时间。

#### 关键要点

- **常见问题**：识别和解决常见问题
- **调试工具**：使用浏览器开发工具
- **日志分析**：分析日志找出根因

**常见问题诊断清单**

| 问题症状 | 可能原因 | 诊断步骤 | 解决方案 |
|---------|---------|---------|---------|
| 数据库无法打开 | 浏览器不支持 | 检查`window.indexedDB` | 实现降级方案 |
| 查询返回空 | 数据未插入 | 检查表数据量 | 验证插入逻辑 |
| 查询速度慢 | 缺少索引 | 检查查询计划 | 创建空间索引 |
| 存储配额满 | 数据过多 | 检查存储使用 | 清理旧数据 |
| 内存泄漏 | 未关闭连接 | 检查数据库实例 | 确保关闭连接 |
| 数据不同步 | 多标签页冲突 | 检查存储事件 | 实现同步机制 |

**示例代码：诊断工具**
```typescript
// 诊断工具
class DiagnosticTool {
  // 全面诊断
  async diagnose(): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
      timestamp: Date.now(),
      checks: {}
    };

    // 浏览器支持
    report.checks.browserSupport = this.checkBrowserSupport();

    // 数据库状态
    report.checks.database = await this.checkDatabase();

    // 存储状态
    report.checks.storage = await this.checkStorage();

    // 内存使用
    report.checks.memory = this.checkMemory();

    // 性能指标
    report.checks.performance = await this.checkPerformance();

    return report;
  }

  // 检查浏览器支持
  checkBrowserSupport() {
    return {
      indexedDB: !!window.indexedDB,
      storage: !!navigator.storage,
      webWorker: !!window.Worker,
      serviceWorker: 'serviceWorker' in navigator
    };
  }

  // 检查数据库状态
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

  // 检查存储状态
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

  // 检查内存使用
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

  // 检查性能
  async checkPerformance() {
    const metrics = await this.runPerformanceTests();

    return {
      insert: metrics.insert,
      query: metrics.query,
      status: metrics.insert < 100 && metrics.query < 50 ? 'ok' : 'slow'
    };
  }

  // 运行性能测试
  async runPerformanceTests() {
    const testFeature = {
      id: 'test-perf',
      type: 'Point',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {}
    };

    // 测试插入
    const insertStart = performance.now();
    await db.features.put(testFeature);
    const insertTime = performance.now() - insertStart;

    // 测试查询
    const queryStart = performance.now();
    await db.features.get('test-perf');
    const queryTime = performance.now() - queryStart;

    // 清理
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

// 使用
const diagnostic = new DiagnosticTool();

// 在控制台运行诊断
(window as any).runDiagnostics = async () => {
  const report = await diagnostic.diagnose();
  console.table(report.checks);
  return report;
};

// 在出现问题时自动运行
window.addEventListener('error', async () => {
  const report = await diagnostic.diagnose();

  // 发送诊断报告
  await fetch('/api/diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  });
});
```

---

## 实战练习

### 场景: 企业级GIS平台

构建一个具备权限管理、审计日志、自动备份功能的企业级GIS平台。

#### 任务要求

1. 实现基于角色的权限管理系统
2. 记录所有数据变更的审计日志
3. 配置自动备份和灾难恢复
4. 实施全面的错误监控和性能监控
5. 创建生产环境检查清单

#### 实现步骤

<details>
<summary>查看实现步骤</summary>

1. **步骤一**: 设置权限管理系统
   ```typescript
   // 权限定义
   interface Permission {
     id: string;
     role: string;
     resource: string;
     action: 'read' | 'create' | 'update' | 'delete';
     granted: boolean;
   }

   // 角色定义
   interface Role {
     id: string;
     name: string;
     permissions: string[];
   }

   // 权限管理器
   class RBACManager {
     async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
       // 获取用户角色
       const user = await db.users.get(userId);
       if (!user) return false;

       // 检查角色权限
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

   // 初始化权限
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

2. **步骤二**: 实现审计日志系统
   ```typescript
   // 审计日志接口
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

   // 审计日志管理器
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

   // 在数据库操作中记录审计日志
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

3. **步骤三**: 配置自动备份
   ```typescript
   // 备份配置
   const backupConfig = {
     interval: 60 * 60 * 1000, // 1小时
     retention: 30, // 保留30天
     compression: true
   };

   // 创建备份管理器
   const backupManager = new BackupManager(backupConfig.interval);

   // 启动自动备份
   backupManager.startAutoBackup();

   // 每天清理旧备份
   setInterval(() => {
     backupManager.cleanupOldBackups(backupConfig.retention);
   }, 24 * 60 * 60 * 1000);

   // 备份到服务器
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

4. **步骤四**: 实施监控
   ```typescript
   // 组合监控系统
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
       // 性能监控
       this.performanceMonitor.start();

       // 健康检查
       setInterval(async () => {
         const health = await this.healthChecker.checkAll();
         this.logger.info('Health check', health);

         if (!Object.values(health).every(result => result)) {
           this.sendAlert('Health check failed', health);
         }
       }, 5 * 60 * 1000);

       // 错误监控
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

   // 启动监控
   const monitor = new ProductionMonitor();
   await monitor.start();
   ```

5. **步骤五**: 创建生产检查清单
   ```typescript
   // 生产环境检查清单
   const productionChecklist = {
     // 配置检查
     config: [
       '环境变量已正确配置',
       'API端点指向生产环境',
       '调试模式已禁用',
       '错误报告已配置'
     ],

     // 安全检查
     security: [
       '所有用户输入已验证',
       '敏感数据已加密',
       '权限系统已启用',
       'HTTPS已启用',
       'CORS已正确配置'
     ],

     // 性能检查
     performance: [
       '代码已压缩和混淆',
       '资源已分割和懒加载',
       '缓存策略已配置',
       'CDN已配置',
       '空间索引已创建'
     ],

     // 监控检查
     monitoring: [
       '性能监控已启用',
       '错误监控已启用',
       '日志记录已配置',
       '健康检查已配置',
       '告警系统已配置'
     ],

     // 备份检查
     backup: [
       '自动备份已启用',
       '备份恢复已测试',
       '备份保留策略已配置',
       '灾难恢复计划已制定'
     ],

     // 测试检查
     testing: [
       '单元测试覆盖率 > 80%',
       '集成测试已通过',
       'E2E测试已通过',
       '性能测试已通过',
       '安全测试已通过'
     ]
   };

   // 运行检查
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

#### 测试验证

```typescript
// 测试权限系统
describe('RBAC System', () => {
  it('should enforce permissions', async () => {
    const rbac = new RBACManager();

    // 创建测试用户
    await db.users.put({
      id: 'user1',
      role: 'viewer'
    });

    // 检查权限
    const canRead = await rbac.hasPermission('user1', 'features', 'read');
    const canDelete = await rbac.hasPermission('user1', 'features', 'delete');

    expect(canRead).toBe(true);
    expect(canDelete).toBe(false);
  });
});

// 测试审计日志
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

// 测试备份恢复
describe('Backup & Restore', () => {
  it('should backup and restore data', async () => {
    // 创建备份
    const backupId = await backupManager.createBackup();

    // 修改数据
    await db.features.put({
      id: 'test-1',
      name: 'Modified'
    });

    // 恢复备份
    await backupManager.restoreBackup(backupId);

    // 验证数据已恢复
    const restored = await db.features.get('test-1');
    expect(restored.name).not.toBe('Modified');
  });
});
```

#### 答案参考

<details>
<summary>查看完整答案</summary>

```typescript
// 完整的企业级GIS平台实现

// 1. 初始化数据库
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

  // 初始化角色和权限
  await initializeRolesAndPermissions();

  return db;
}

// 2. 创建完整的监控系统
const monitor = new ProductionMonitor();

// 3. 配置自动备份
const backupManager = new BackupManager(60 * 60 * 1000);
backupManager.startAutoBackup();

// 4. 启动应用
async function startApplication() {
  // 运行生产检查
  await runProductionChecks();

  // 启动监控
  await monitor.start();

  // 检查数据库健康
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

## 常见问题

### Q: 如何处理多标签页的数据同步？

**A:** 使用 `storage` 事件监听其他标签页的变更，并在变更后重新加载数据。

```typescript
// 监听其他标签页的变更
window.addEventListener('storage', (e) => {
  if (e.key === 'webgeodb-change') {
    console.log('Data changed in another tab');
    reloadData();
  }
});

// 在变更后通知其他标签页
async function notifyChange() {
  localStorage.setItem('webgeodb-change', Date.now().toString());
  localStorage.removeItem('webgeodb-change');
}
```

### Q: 如何优化大量数据的插入性能？

**A:** 使用批量插入、禁用索引、分批处理。

```typescript
// 批量插入
await db.features.insertMany(largeDataset);

// 分批处理
const batchSize = 1000;
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  await db.features.insertMany(batch);
}
```

### Q: 如何实现数据库版本升级？

**A:** 使用 `upgrade` 回调处理版本升级，支持从任何旧版本升级。

```typescript
const db = new WebGeoDB({
  name: 'my-db',
  version: 3,
  upgrade: (oldVersion, newVersion) => {
    if (oldVersion < 1) {
      // 创建初始表
    }
    if (oldVersion < 2) {
      // 添加新字段
    }
    if (oldVersion < 3) {
      // 添加新表
    }
  }
});
```

### Q: 如何监控生产环境的错误？

**A:** 集成错误监控服务（如Sentry），或实现自定义错误上报。

```typescript
// 全局错误捕获
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

## 小结

本章学习了如何将 WebGeoDB 应用部署到生产环境，包括配置管理、安全防护、测试策略、性能监控、备份恢复和故障排查。

### 核心要点回顾

- ✅ 实施完整的版本管理和环境配置
- ✅ 建立多层次的安全防护体系
- ✅ 建立全面的测试策略（单元、集成、E2E、性能）
- ✅ 实施持续的性能和错误监控
- ✅ 制定可靠的备份和灾难恢复方案
- ✅ 掌握快速诊断和解决问题的方法

### 生产环境检查清单

#### 部署前检查

- [ ] 环境变量已正确配置
- [ ] 所有调试代码已移除
- [ ] 代码已压缩和优化
- [ ] 安全审计已通过
- [ ] 测试覆盖率 > 80%

#### 安全检查

- [ ] 输入验证已实施
- [ ] XSS防护已启用
- [ ] 敏感数据已加密
- [ ] 权限系统已配置
- [ ] HTTPS已启用

#### 监控检查

- [ ] 性能监控已启用
- [ ] 错误监控已启用
- [ ] 日志系统已配置
- [ ] 告警规则已设置
- [ ] 健康检查已配置

#### 备份检查

- [ ] 自动备份已启用
- [ ] 备份恢复已测试
- [ ] 保留策略已配置
- [ ] 异地备份已配置

### 下一步学习

- **[第6章: 高级主题](./chapter-06-advanced-topics.md)** - 学习插件系统、扩展API、性能调优
- **[API参考](../../api/reference.md)** - 查看完整API文档
- **[实战示例](../../examples/enterprise-platform/)** - 查看企业级平台完整代码

---

## 参考资源

### 官方文档

- **[WebGeoDB文档](../../)** - 完整项目文档
- **[API参考](../../api/reference.md)** - API详细说明
- **[最佳实践](../../guides/best-practices.md)** - 开发最佳实践
- **[故障排除](../../guides/troubleshooting.md)** - 问题排查指南

### 相关资源

- **[IndexedDB规范](https://w3c.github.io/IndexedDB/)** - W3C官方规范
- **[Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)** - 数据加密
- **[Progressive Web App](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)** - PWA指南

### 工具推荐

- **[Vitest](https://vitest.dev/)** - 单元测试框架
- **[Playwright](https://playwright.dev/)** - E2E测试框架
- **[Sentry](https://sentry.io/)** - 错误监控
- **[Lighthouse](https://developer.chrome.com/docs/lighthouse/overview)** - 性能分析
