# WebGeoDB 最佳实践

本指南总结了使用 WebGeoDB 的最佳实践、常见设计模式和需要注意的事项。

---

## 目录

1. [数据建模](#数据建模)
2. [错误处理](#错误处理)
3. [事务管理](#事务管理)
4. [生产环境配置](#生产环境配置)
5. [常见陷阱](#常见陷阱)
6. [设计模式](#设计模式)
7. [安全性考虑](#安全性考虑)

---

## 数据建模

### 1. 合理设计表结构

**✅ 推荐**：
```typescript
db.schema({
  features: {
    // 主键：使用有意义的 ID
    id: 'string',

    // 属性字段：使用明确的类型
    name: 'string',
    type: 'string',
    category: 'string',

    // 几何字段：使用 geometry 类型
    geometry: 'geometry',

    // 复杂对象：使用 json 类型
    properties: 'json',

    // 时间戳：使用 number 类型（时间戳）
    createdAt: 'number',
    updatedAt: 'number'
  }
});
```

**❌ 避免**：
```typescript
// 过度规范化
db.schema({
  features: {
    id: 'string',
    name: 'string',
    // 几何数据分散存储
    geometryType: 'string',
    geometryCoordinates: 'json',
    // ...
  }
});
```

### 2. 使用合适的几何类型

| 场景 | 推荐类型 | 理由 |
|------|----------|------|
| 单个位置 | Point | 最简单的几何类型，性能最优 |
| 路径/轨迹 | LineString | 保留顺序，支持距离计算 |
| 区域/边界 | Polygon | 支持包含、相交等空间查询 |
| 多个不连续区域 | MultiPolygon | 一次性存储多个区域 |
| 混合几何 | GeometryCollection | 灵活但性能较差，慎用 |

### 3. 字段命名规范

**推荐命名**：
- 使用 camelCase（如 `createdAt`）
- 布尔值使用 `is/has` 前缀（如 `isActive`）
- 时间字段使用 `At/On` 后缀（如 `updatedAt`）
- ID 字段统一命名为 `id`

```typescript
db.schema({
  users: {
    id: 'string',
    name: 'string',
    email: 'string',
    isActive: 'boolean',
    lastLoginAt: 'number',
    createdAt: 'number'
  }
});
```

### 4. 数据冗余 vs 性能

**冗余可以提升性能**：
```typescript
// 为查询方便，在 features 表中冗余存储类别名称
db.schema({
  features: {
    id: 'string',
    categoryId: 'string',    // 外键
    categoryName: 'string',  // 冗余字段，避免联表查询
    geometry: 'geometry'
  }
});
```

**但要注意数据一致性**：
```typescript
// 更新类别名称时，需要同步更新所有相关要素
async function updateCategoryName(categoryId: string, newName: string) {
  await db.transaction('rw', [db.categories, db.features], async () => {
    // 更新类别表
    await db.categories.update(categoryId, { name: newName });

    // 更新所有相关要素
    await db.features
      .where('categoryId', '=', categoryId)
      .modify({ categoryName: newName });
  });
}
```

---

## 错误处理

### 1. 始终处理异步操作错误

**✅ 推荐**：
```typescript
try {
  await db.open();
} catch (error) {
  if (error.name === 'VersionError') {
    // 数据库版本冲突
    console.error('Database version mismatch');
    // 提示用户刷新页面或清除存储
  } else if (error.name === 'InvalidStateError') {
    // 浏览器不支持 IndexedDB
    console.error('IndexedDB not supported');
    // 降级到其他存储方案
  } else {
    // 其他错误
    console.error('Failed to open database:', error);
  }
}
```

**❌ 避免**：
```typescript
// 没有错误处理
await db.open();
```

### 2. 处理查询结果为空的情况

**✅ 推荐**：
```typescript
const results = await db.features
  .where('type', '=', 'restaurant')
  .toArray();

if (results.length === 0) {
  // 处理空结果
  console.warn('No restaurants found');
  return [];
}

// 继续处理
return results;
```

### 3. 验证输入数据

**✅ 推荐**：
```typescript
async function insertFeature(feature: any) {
  // 验证必需字段
  if (!feature.id) {
    throw new Error('Feature ID is required');
  }

  // 验证几何类型
  if (!feature.geometry || !feature.geometry.type) {
    throw new Error('Invalid geometry');
  }

  // 验证坐标
  if (!Array.isArray(feature.geometry.coordinates)) {
    throw new Error('Invalid coordinates');
  }

  // 插入数据
  await db.features.insert(feature);
}
```

### 4. 处理并发冲突

```typescript
// 使用版本号或时间戳处理并发更新
async function updateFeature(id: string, updates: any, expectedVersion: number) {
  try {
    await db.transaction('rw', db.features, async () => {
      const current = await db.features.get(id);

      // 检查版本
      if (current.version !== expectedVersion) {
        throw new Error('Concurrent modification detected');
      }

      // 更新数据并递增版本
      await db.features.update(id, {
        ...updates,
        version: current.version + 1
      });
    });
  } catch (error) {
    if (error.message === 'Concurrent modification detected') {
      // 重新获取数据或提示用户
      console.warn('Data was modified by another operation');
      throw error;
    }
    throw error;
  }
}
```

---

## 事务管理

### 1. 使用事务保证数据一致性

**✅ 推荐**：
```typescript
// 多个相关操作应该在一个事务中
await db.transaction('rw', [db.features, db.auditLog], async () => {
  // 插入要素
  await db.features.insert(newFeature);

  // 记录审计日志
  await db.auditLog.insert({
    action: 'insert',
    table: 'features',
    id: newFeature.id,
    timestamp: Date.now(),
    user: currentUser
  });

  // 如果任何一个操作失败，整个事务会回滚
});
```

**❌ 避免**：
```typescript
// 分离的操作，可能导致数据不一致
try {
  await db.features.insert(newFeature);
} catch (error) {
  // 如果这里出错，下面的日志仍会记录
  console.error(error);
}

// 这个日志会记录，即使上面的插入失败
await db.auditLog.insert({ ... });
```

### 2. 只读事务用于查询

```typescript
// 明确使用只读事务（性能更好）
const results = await db.transaction('r', db.features, async () => {
  const features = await db.features.toArray();
  const count = await db.features.count();
  return { features, count };
});
```

### 3. 避免长时间运行的事务

**❌ 避免**：
```typescript
// 长时间运行的事务会阻塞其他操作
await db.transaction('rw', db.features, async () => {
  for (let i = 0; i < 10000; i++) {
    await db.features.insert({
      id: `feature-${i}`,
      // 复杂计算
      data: computeExpensiveData(i)
    });
  }
});
```

**✅ 推荐**：
```typescript
// 分批处理，使用多个短事务
const batchSize = 100;
for (let i = 0; i < 10000; i += batchSize) {
  const batch = [];

  for (let j = 0; j < batchSize && i + j < 10000; j++) {
    batch.push({
      id: `feature-${i + j}`,
      data: computeExpensiveData(i + j)
    });
  }

  // 每批一个事务
  await db.features.insertMany(batch);
}
```

---

## 生产环境配置

### 1. 数据库版本管理

```typescript
// 使用版本号管理数据库结构
const DB_VERSION = 1;

const db = new WebGeoDB({
  name: 'my-app-db',
  version: DB_VERSION,
  // 版本升级时的处理
  upgrade: (oldVersion, newVersion, transaction) => {
    if (oldVersion < 1) {
      // 创建初始表结构
      transaction.db.schema({
        features: { /* ... */ }
      });
    }

    if (oldVersion < 2) {
      // 添加新字段或表
      // 迁移数据
    }
  }
});
```

### 2. 错误监控

```typescript
// 集成错误监控服务
class DatabaseErrorHandler {
  handle(error: Error, context: string) {
    // 记录到控制台
    console.error(`[${context}]`, error);

    // 发送到监控服务（如 Sentry）
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: { context },
        extra: { database: db.name }
      });
    }

    // 或发送到自定义日志服务
    this.sendToLogService(error, context);
  }

  private sendToLogService(error: Error, context: string) {
    // 实现日志上报
  }
}

const errorHandler = new DatabaseErrorHandler();

// 使用
try {
  await db.features.insert(data);
} catch (error) {
  errorHandler.handle(error, 'insert_feature');
}
```

### 3. 性能监控

```typescript
// 监控数据库性能
class DatabaseMetrics {
  private metrics = new Map<string, number[]>();

  record(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    this.metrics.get(operation)!.push(duration);

    // 只保留最近 100 条记录
    const records = this.metrics.get(operation)!;
    if (records.length > 100) {
      records.shift();
    }
  }

  getStats(operation: string) {
    const records = this.metrics.get(operation);
    if (!records || records.length === 0) {
      return null;
    }

    const avg = records.reduce((a, b) => a + b, 0) / records.length;
    const max = Math.max(...records);
    const min = Math.min(...records);

    return { avg, max, min, count: records.length };
  }
}

// 使用
const metrics = new DatabaseMetrics();

const start = performance.now();
await db.features.insert(data);
const duration = performance.now() - start;

metrics.record('insert', duration);
```

### 4. 数据备份和恢复

```typescript
// 定期备份数据
async function backupDatabase() {
  const data = {
    features: await db.features.toArray(),
    timestamp: Date.now(),
    version: db.version
  };

  // 转换为 JSON
  const json = JSON.stringify(data);

  // 保存到文件或服务器
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

// 恢复数据
async function restoreDatabase(file: File) {
  const json = await file.text();
  const data = JSON.parse(json);

  // 清空现有数据
  await db.features.clear();

  // 恢复数据
  await db.features.insertMany(data.features);
}
```

### 5. 存储配额管理

```typescript
// 监控存储使用情况
async function checkStorageQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const usagePercent = (usage / quota) * 100;

    console.log(`Storage: ${(usage / 1024 / 1024).toFixed(2)}MB / ${(quota / 1024 / 1024).toFixed(2)}MB (${usagePercent.toFixed(2)}%)`);

    if (usagePercent > 80) {
      console.warn('Storage quota almost full!');

      // 提示用户清理数据
      // 或自动清理旧数据
      await cleanupOldData();
    }

    return { usage, quota, usagePercent };
  }

  return null;
}
```

---

## 常见陷阱

### 1. 忘记关闭数据库

**问题**：
```typescript
// 不关闭数据库，可能导致内存泄漏
async function loadData() {
  const db = new WebGeoDB({ name: 'temp-db' });
  await db.open();

  // 使用数据库
  // ...

  // 忘记关闭！
}
```

**解决方案**：
```typescript
async function loadData() {
  const db = new WebGeoDB({ name: 'temp-db' });

  try {
    await db.open();
    // 使用数据库
  } finally {
    await db.close();
  }
}
```

### 2. 在循环中执行查询

**问题**：
```typescript
// N+1 查询问题
const areas = await db.areas.toArray();

for (const area of areas) {
  // 每次循环都执行一次查询
  const features = await db.features
    .within('geometry', area)
    .toArray();
}
```

**解决方案**：
```typescript
// 一次性查询所有数据，在内存中处理
const [areas, features] = await Promise.all([
  db.areas.toArray(),
  db.features.toArray()
]);

const results = areas.map(area => ({
  area,
  features: features.filter(f =>
    isWithin(f.geometry, area.geometry)
  )
}));
```

### 3. 忽略浏览器兼容性

**解决方案**：
```typescript
// 检测 IndexedDB 支持
function checkIndexedDBSupport(): boolean {
  return !!(window.indexedDB);
}

// 降级方案
class StorageAdapter {
  private db: WebGeoDB | null = null;
  private fallback: Map<string, any> | null = null;

  async init() {
    if (checkIndexedDBSupport()) {
      this.db = new WebGeoDB({ name: 'app-db' });
      await this.db.open();
    } else {
      // 降级到内存存储
      this.fallback = new Map();
      console.warn('IndexedDB not supported, using memory storage');
    }
  }

  async get(key: string) {
    if (this.db) {
      return await this.db.features.get(key);
    } else {
      return this.fallback!.get(key);
    }
  }
}
```

### 4. 过度使用空间索引

**问题**：
```typescript
// 为小数据集创建索引（适得其反）
db.features.createIndex('geometry');  // 只有 100 条数据
```

**解决方案**：
```typescript
// 根据数据量决定是否创建索引
const count = await db.features.count();

if (count > 1000) {
  db.features.createIndex('geometry');
}
```

### 5. 不处理版本冲突

**解决方案**：
```typescript
const db = new WebGeoDB({
  name: 'app-db',
  version: CURRENT_VERSION,
  // 处理版本冲突
  blocked: () => {
    // 当其他标签页正在使用旧版本时触发
    console.error('Database version conflict. Please close other tabs and refresh.');
    alert('数据库版本冲突。请关闭其他标签页后刷新页面。');
  },
  blocking: () => {
    // 当当前标签页正在使用旧版本，其他标签页尝试打开新版本时触发
    console.log('Please close this tab to allow database upgrade.');
  }
});
```

---

## 设计模式

### 1. Repository 模式

```typescript
// 封装数据访问逻辑
class FeatureRepository {
  constructor(private db: WebGeoDB) {}

  async findById(id: string) {
    return await this.db.features.get(id);
  }

  async findByType(type: string) {
    return await this.db.features
      .where('type', '=', type)
      .toArray();
  }

  async findNearby(geometry: Geometry, distance: number) {
    return await this.db.features
      .distance('geometry', geometry.coordinates, '<', distance)
      .toArray();
  }

  async create(feature: Feature) {
    return await this.db.features.insert(feature);
  }

  async update(id: string, updates: Partial<Feature>) {
    return await this.db.features.update(id, updates);
  }

  async delete(id: string) {
    return await this.db.features.delete(id);
  }
}

// 使用
const repo = new FeatureRepository(db);
const restaurants = await repo.findByType('restaurant');
```

### 2. Unit of Work 模式

```typescript
// 跟踪变更，批量提交
class UnitOfWork {
  private inserts = new Map<string, any>();
  private updates = new Map<string, any>();
  private deletes = new Set<string>();

  registerInsert(table: string, data: any) {
    this.inserts.set(`${table}:${data.id}`, { table, data });
  }

  registerUpdate(table: string, id: string, data: any) {
    this.updates.set(`${table}:${id}`, { table, id, data });
  }

  registerDelete(table: string, id: string) {
    this.deletes.add(`${table}:${id}`);
  }

  async commit(db: WebGeoDB) {
    await db.transaction('rw', [db.features, db.otherTable], async () => {
      // 执行删除
      for (const key of this.deletes) {
        const [table, id] = key.split(':');
        await db[table].delete(id);
      }

      // 执行更新
      for (const [, { table, id, data }] of this.updates) {
        await db[table].update(id, data);
      }

      // 执行插入
      for (const [, { table, data }] of this.inserts) {
        await db[table].insert(data);
      }
    });

    // 清空跟踪
    this.inserts.clear();
    this.updates.clear();
    this.deletes.clear();
  }
}
```

### 3. Cache-Aside 模式

```typescript
// 缓存 + 数据库
class CachedFeatureService {
  private cache = new Map<string, { data: any, expiry: number }>();
  private cacheTimeout = 60000; // 1 分钟

  async getFeature(id: string): Promise<any> {
    // 检查缓存
    const cached = this.cache.get(id);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // 从数据库加载
    const feature = await db.features.get(id);

    // 更新缓存
    this.cache.set(id, {
      data: feature,
      expiry: Date.now() + this.cacheTimeout
    });

    return feature;
  }

  async updateFeature(id: string, data: any) {
    // 更新数据库
    await db.features.update(id, data);

    // 失效缓存
    this.cache.delete(id);
  }
}
```

---

## 安全性考虑

### 1. 输入验证

```typescript
// 验证用户输入
function validateFeature(data: any): data is Feature {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // 验证必需字段
  if (!data.id || typeof data.id !== 'string') {
    return false;
  }

  // 验证几何数据
  if (!data.geometry || !data.geometry.type) {
    return false;
  }

  // 验证坐标是数字
  const coords = data.geometry.coordinates;
  if (!Array.isArray(coords)) {
    return false;
  }

  return true;
}

// 使用
if (validateFeature(userInput)) {
  await db.features.insert(userInput);
} else {
  throw new Error('Invalid feature data');
}
```

### 2. 防止 XSS

```typescript
// 显示用户数据时进行转义
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 使用
const feature = await db.features.get(id);
element.innerHTML = `Name: ${escapeHtml(feature.name)}`;
```

### 3. 敏感数据加密

```typescript
// 加密敏感数据
async function encryptData(data: string, key: string): Promise<string> {
  // 使用 Web Crypto API
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const keyBuffer = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyBuffer,
    dataBuffer
  );

  // 组合 IV 和加密数据
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}
```

---

## 总结

### 关键要点

1. **数据建模**：
   - 合理设计表结构
   - 使用合适的几何类型
   - 平衡规范化和性能

2. **错误处理**：
   - 始终处理异步错误
   - 验证输入数据
   - 处理并发冲突

3. **事务管理**：
   - 使用事务保证一致性
   - 避免长时间运行的事务
   - 合理使用只读事务

4. **生产环境**：
   - 管理数据库版本
   - 监控性能和错误
   - 定期备份数据

5. **避免陷阱**：
   - 关闭数据库连接
   - 避免循环查询
   - 检查浏览器兼容性
   - 根据数据量使用索引

---

**相关文档**：
- [快速开始](./getting-started.md)
- [性能优化指南](./performance.md)
- [API 参考](./api/reference.md)
