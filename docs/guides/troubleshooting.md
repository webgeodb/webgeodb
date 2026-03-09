# WebGeoDB 故障排除指南

本指南帮助您诊断和解决使用 WebGeoDB 时遇到的常见问题。

---

## 目录

1. [常见问题](#常见问题)
2. [调试技巧](#调试技巧)
3. [性能问题](#性能问题)
4. [浏览器兼容性](#浏览器兼容性)
5. [数据问题](#数据问题)
6. [错误代码参考](#错误代码参考)

---

## 常见问题

### 1. 数据库无法打开

**症状**：
```typescript
const db = new WebGeoDB({ name: 'my-db' });
await db.open(); // 抛出错误
```

**可能原因**：

#### 原因 1：浏览器不支持 IndexedDB
```typescript
// 检查浏览器支持
if (!window.indexedDB) {
  console.error('IndexedDB is not supported in this browser');
  // 使用降级方案（如 localStorage 或内存存储）
}
```

**解决方案**：
- 使用现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）
- 实现降级方案

#### 原因 2：存储配额已满
```typescript
// 检查存储配额
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate();
  const usagePercent = ((estimate.usage || 0) / (estimate.quota || 1)) * 100;

  if (usagePercent > 95) {
    console.error('Storage quota almost full');
    // 清理旧数据或提示用户
  }
}
```

**解决方案**：
- 清理旧数据
- 删除不用的数据库
- 提示用户清理浏览器存储

#### 原因 3：隐私模式阻止存储
```typescript
// 检测是否在隐私模式
async function isPrivateMode(): Promise<boolean> {
  try {
    const testDB = window.indexedDB.open('test');
    return new Promise((resolve) => {
      testDB.onsuccess = () => {
        window.indexedDB.deleteDatabase('test');
        resolve(false);
      };
      testDB.onerror = () => resolve(true);
    });
  } catch {
    return true;
  }
}
```

**解决方案**：
- 提示用户退出隐私模式
- 使用会话存储或内存存储

---

### 2. 查询返回空结果

**症状**：
```typescript
const results = await db.features
  .where('type', '=', 'restaurant')
  .toArray();

console.log(results); // []
```

**可能原因**：

#### 原因 1：数据未插入
```typescript
// 验证数据是否存在
const count = await db.features.count();
console.log(`Total features: ${count}`);

if (count === 0) {
  console.warn('No data in database. Did you insert any data?');
}
```

#### 原因 2：字段名称拼写错误
```typescript
// ❌ 错误
db.features.where('Type', '=', 'restaurant')  // 大小写错误

// ✅ 正确
db.features.where('type', '=', 'restaurant')
```

#### 原因 3：比较操作符错误
```typescript
// ❌ 错误：字符串应该用 'equals' 而不是 '>'
db.features.where('type', '>', 'restaurant')

// ✅ 正确
db.features.where('type', '=', 'restaurant')
```

#### 原因 4：数据类型不匹配
```typescript
// schema 中定义为 'number'
db.schema({
  features: {
    count: 'number'
  }
});

// 但插入的是字符串
await db.features.insert({ count: '10' });  // ❌ 错误

// 应该插入数字
await db.features.insert({ count: 10 });  // ✅ 正确
```

---

### 3. 查询速度慢

**症状**：
```typescript
console.time('query');
const results = await db.features
  .distance('geometry', point, '<', 1000)
  .toArray();
console.timeEnd('query'); // 超过 1 秒
```

**可能原因**：

#### 原因 1：没有创建空间索引
```typescript
// 检查是否有索引
const hasIndex = await checkHasIndex(db, 'features', 'geometry');

if (!hasIndex) {
  console.warn('No spatial index found. Creating one...');
  db.features.createIndex('geometry', { auto: true });
}

async function checkHasIndex(db: any, table: string, field: string): Promise<boolean> {
  // 实现索引检查逻辑
  // ...
}
```

#### 原因 2：数据量太大
```typescript
// 考虑使用分页
const results = await db.features
  .distance('geometry', point, '<', 1000)
  .limit(100)  // 限制返回数量
  .toArray();
```

#### 原因 3：使用了复杂的嵌套查询
```typescript
// ❌ 慢：多次查询
const results = [];
const features = await db.features.toArray();

for (const feature of features) {
  const related = await db.related
    .where('featureId', '=', feature.id)
    .toArray();
  results.push({ ...feature, related });
}

// ✅ 快：一次性查询
const [features, related] = await Promise.all([
  db.features.toArray(),
  db.related.toArray()
]);

const results = features.map(f => ({
  ...f,
  related: related.filter(r => r.featureId === f.id)
}));
```

---

### 4. 内存泄漏

**症状**：
- 页面运行一段时间后变慢
- 浏览器任务管理器显示内存持续增长

**可能原因**：

#### 原因 1：未关闭数据库
```typescript
// ❌ 错误
function useDatabase() {
  const db = new WebGeoDB({ name: 'temp-db' });
  db.open();
  // 使用后不关闭
}

// ✅ 正确
async function useDatabase() {
  const db = new WebGeoDB({ name: 'temp-db' });
  try {
    await db.open();
    // 使用数据库
  } finally {
    await db.close();
  }
}
```

#### 原因 2：缓存了过多数据
```typescript
// 限制缓存大小
class LRUCache {
  private cache = new Map<string, any>();
  private maxSize = 100;

  set(key: string, value: any) {
    if (this.cache.size >= this.maxSize) {
      // 删除最旧的项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  get(key: string) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 移到末尾（最近使用）
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
}
```

#### 原因 3：事件监听器未移除
```typescript
// 记得移除监听器
class DatabaseManager {
  private listeners: Array<() => void> = [];

  addListener(fn: () => void) {
    this.listeners.push(fn);
  }

  removeAllListeners() {
    this.listeners = [];
  }

  destroy() {
    this.removeAllListeners();
  }
}
```

---

## 调试技巧

### 1. 使用浏览器开发工具

#### IndexedDB 查看器
1. 打开 Chrome DevTools (F12)
2. 进入 "Application" 面板
3. 左侧选择 "IndexedDB"
4. 查看数据库、表和索引

#### 控制台调试
```typescript
// 添加调试日志
db.features.hooks.creating.subscribe((primKey, obj) => {
  console.log('Creating:', primKey, obj);
});

db.features.hooks.updating.subscribe((modifications, primKey, obj) => {
  console.log('Updating:', primKey, modifications, obj);
});

db.features.hooks.deleting.subscribe((primKey, obj) => {
  console.log('Deleting:', primKey, obj);
});
```

### 2. 启用详细日志

```typescript
// 创建一个日志包装器
class LoggingDatabase extends WebGeoDB {
  async open() {
    console.log(`Opening database: ${this.name}`);
    const result = await super.open();
    console.log(`Database opened successfully`);
    return result;
  }
}

// 或使用代理
function createLoggingProxy(db: WebGeoDB) {
  return new Proxy(db, {
    get(target, prop) {
      const value = target[prop];

      if (typeof value === 'function') {
        return function (...args: any[]) {
          console.log(`Calling ${String(prop)}:`, args);
          const result = value.apply(target, args);
          if (result instanceof Promise) {
            return result.then(r => {
              console.log(`${String(prop)} result:`, r);
              return r;
            });
          }
          return result;
        };
      }

      return value;
    }
  });
}

const db = createLoggingProxy(new WebGeoDB({ name: 'my-db' }));
```

### 3. 性能分析

```typescript
// 测量查询性能
class PerformanceProfiler {
  private measurements = new Map<string, number[]>();

  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();

    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;

      if (!this.measurements.has(label)) {
        this.measurements.set(label, []);
      }

      this.measurements.get(label)!.push(duration);
      console.log(`${label}: ${duration.toFixed(2)}ms`);
    }
  }

  getStats(label: string) {
    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { avg, min, max, count: measurements.length };
  }

  printReport() {
    for (const [label, measurements] of this.measurements) {
      const stats = this.getStats(label);
      if (stats) {
        console.log(`${label}:`);
        console.log(`  Average: ${stats.avg.toFixed(2)}ms`);
        console.log(`  Min: ${stats.min.toFixed(2)}ms`);
        console.log(`  Max: ${stats.max.toFixed(2)}ms`);
        console.log(`  Count: ${stats.count}`);
      }
    }
  }
}

// 使用
const profiler = new PerformanceProfiler();

const results = await profiler.measure('query', async () => {
  return await db.features
    .where('type', '=', 'restaurant')
    .toArray();
});

profiler.printReport();
```

---

## 性能问题

### 1. 插入性能差

**症状**：
- 插入 1000 条数据需要几秒甚至更久

**解决方案**：

#### 批量插入
```typescript
// ❌ 慢：循环插入
for (const feature of features) {
  await db.features.insert(feature);
}

// ✅ 快：批量插入
await db.features.insertMany(features);
```

#### 禁用自动更新索引
```typescript
// 批量导入时，先不创建索引
await db.features.clear();
await db.features.insertMany(largeDataset);

// 导入完成后再创建索引
db.features.createIndex('geometry', { type: 'flatbush' });
```

### 2. 查询性能差

**症状**：
- 简单查询需要几百毫秒甚至更久

**解决方案**：

#### 创建空间索引
```typescript
// 检查是否已有索引
// （WebGeoDB 可能不提供直接检查索引的 API）
// 保险的做法是重新创建索引

db.features.createIndex('geometry', { auto: true });
```

#### 使用合适的索引类型
```typescript
// 动态数据：使用 R-Tree
db.features.createIndex('geometry', { type: 'rbush' });

// 静态数据：使用 Static
db.features.createIndex('geometry', { type: 'flatbush' });
```

#### 优化查询条件
```typescript
// ❌ 慢：获取所有数据后在内存中过滤
const all = await db.features.toArray();
const filtered = all.filter(f =>
  calculateDistance(f.geometry, point) < 1000
);

// ✅ 快：使用空间查询
const filtered = await db.features
  .distance('geometry', point, '<', 1000)
  .toArray();
```

### 3. 内存占用高

**症状**：
- 页面占用几百 MB 甚至 GB 内存

**解决方案**：

#### 分批处理数据
```typescript
// ❌ 一次性加载所有数据
const all = await db.features.toArray();
all.forEach(processFeature);

// ✅ 分批处理
const batchSize = 100;
let offset = 0;

while (true) {
  const batch = await db.features
    .offset(offset)
    .limit(batchSize)
    .toArray();

  if (batch.length === 0) break;

  batch.forEach(processFeature);
  offset += batchSize;
}
```

#### 使用游标
```typescript
// 使用游标逐条处理
await db.features.each(feature => {
  processFeature(feature);
});
```

#### 及时清理引用
```typescript
let largeDataset = await db.features.toArray();

// 处理数据
const processed = process(largeDataset);

// 清理引用
largeDataset = null;
```

---

## 浏览器兼容性

### 1. IndexedDB 不支持

**检测**：
```typescript
if (!window.indexedDB) {
  console.error('IndexedDB not supported');
}
```

**降级方案**：
```typescript
class StorageAdapter {
  private useIndexedDB: boolean;
  private memoryStorage: Map<string, any> = new Map();

  constructor() {
    this.useIndexedDB = !!window.indexedDB;
  }

  async get(key: string) {
    if (this.useIndexedDB) {
      // 使用 IndexedDB
      const db = await this.getDB();
      return await db.get(key);
    } else {
      // 使用内存存储
      return this.memoryStorage.get(key);
    }
  }

  async set(key: string, value: any) {
    if (this.useIndexedDB) {
      // 使用 IndexedDB
      const db = await this.getDB();
      await db.put(value);
    } else {
      // 使用内存存储
      this.memoryStorage.set(key, value);
    }
  }

  private async getDB() {
    // IndexedDB 实现细节
  }
}
```

### 2. 私有模式

**检测**：
```typescript
async function isPrivateMode(): Promise<boolean> {
  try {
    const testDB = window.indexedDB.open('test');
    return new Promise((resolve) => {
      testDB.onsuccess = () => {
        window.indexedDB.deleteDatabase('test');
        resolve(false);
      };
      testDB.onerror = () => resolve(true);
    });
  } catch {
    return true;
  }
}
```

**处理**：
```typescript
if (await isPrivateMode()) {
  alert('您正在使用隐私模式。某些功能可能无法正常使用。建议退出隐私模式或使用其他浏览器。');
}
```

### 3. 浏览器差异

#### Safari IndexedDB 配额较低
```typescript
// Safari 的 IndexedDB 配额通常比 Chrome/Firefox 小
// 需要更积极地清理旧数据

async function cleanupOldData() {
  const cutoffDate = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 天前

  await db.features
    .where('createdAt', '<', cutoffDate)
    .delete();
}
```

#### Firefox 可能弹出权限请求
```typescript
// Firefox 可能会请求存储权限
// 提前请求并处理

if (navigator.permissions) {
  try {
    const permission = await navigator.permissions.query({ name: 'persistent-storage' });
    if (permission.state === 'prompt') {
      // 提示用户授权
      permission.onchange = () => {
        if (permission.state === 'granted') {
          console.log('Persistent storage granted');
        }
      };
    }
  } catch (e) {
    // 浏览器不支持此 API
  }
}
```

---

## 数据问题

### 1. 数据损坏

**症状**：
- 查询抛出异常
- 数据显示异常

**解决方案**：

#### 重建数据库
```typescript
async function rebuildDatabase() {
  // 备份数据
  const backup = {
    features: await db.features.toArray(),
    timestamp: Date.now()
  };

  // 删除旧数据库
  await db.delete();

  // 创建新数据库
  const newDb = new WebGeoDB({ name: db.name });
  await newDb.open();

  // 恢复数据
  await newDb.features.insertMany(backup.features);

  return newDb;
}
```

#### 数据验证
```typescript
function validateFeature(feature: any): boolean {
  if (!feature) return false;
  if (!feature.id) return false;
  if (!feature.geometry) return false;
  if (!feature.geometry.type) return false;

  const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
  if (!validTypes.includes(feature.geometry.type)) return false;

  return true;
}

// 清理无效数据
async function cleanInvalidData() {
  const all = await db.features.toArray();

  const valid = all.filter(validateFeature);
  const invalid = all.filter(f => !validateFeature(f));

  if (invalid.length > 0) {
    console.warn(`Found ${invalid.length} invalid features, removing...`);

    await db.features.clear();
    await db.features.insertMany(valid);
  }
}
```

### 2. 版本冲突

**症状**：
```
VersionError: The database is using a higher version than requested
```

**解决方案**：

```typescript
const CURRENT_VERSION = 2;

const db = new WebGeoDB({
  name: 'my-db',
  version: CURRENT_VERSION,

  // 处理版本冲突
  blocked: () => {
    console.error('Database version conflict. Please close other tabs and refresh.');
    alert('数据库版本冲突。请关闭其他标签页后刷新页面。');
  },

  blocking: () => {
    console.log('This tab is blocking database upgrade. Please close it.');
  },

  // 版本升级处理
  upgrade: (oldVersion, newVersion) => {
    console.log(`Upgrading database from ${oldVersion} to ${newVersion}`);

    if (oldVersion < 2) {
      // 添加新字段或表
      // 迁移数据
    }
  }
});
```

### 3. 数据同步问题

**症状**：
- 多个标签页的数据不一致
- 更新丢失

**解决方案**：

```typescript
// 监听其他标签页的变更
window.addEventListener('storage', (e) => {
  if (e.key === 'webgeodb-change') {
    // 刷新数据
    console.log('Data changed in another tab');
    reloadData();
  }
});

// 在变更后通知其他标签页
async function notifyChange() {
  localStorage.setItem('webgeodb-change', Date.now().toString());
  localStorage.removeItem('webgeodb-change');
}

async function updateFeature(id: string, data: any) {
  await db.features.update(id, data);

  // 通知其他标签页
  await notifyChange();
}
```

---

## 错误代码参考

### IndexedDB 错误

| 错误代码 | 错误名称 | 原因 | 解决方案 |
|---------|---------|------|----------|
| 0 | `UnknownError` | 未知错误 | 检查浏览器控制台日志 |
| 1 | `NoSuchDatabaseError` | 数据库不存在 | 确保数据库名称正确 |
| 2 | `InvalidStateError` | 数据库状态无效 | 确保数据库已打开 |
| 3 | `ReadOnlyError` | 尝试修改只读数据库 | 检查事务模式 |
| 4 | `TransactionInactiveError` | 事务已结束 | 确保在事务有效期内操作 |
| 5 | `AbortError` | 事务被中止 | 检查事务错误处理 |
| 6 | `TimeoutError` | 操作超时 | 重试操作或检查数据量 |
| 7 | `QuotaExceededError` | 存储配额已满 | 清理旧数据 |
| 8 | `InvalidAccessError` | 无效访问 | 检查索引和键 |
| 9 | `VersionError` | 版本冲突 | 更新数据库版本 |
| 10 | `ConstraintError` | 约束违反 | 检查主键和唯一约束 |
| 11 | `DataError` | 数据无效 | 验证数据格式 |
| 12 | `TransactionInactiveError` | 事务不活跃 | 确保在事务内操作 |
| 13 | `SerialisationError` | 数据序列化失败 | 检查数据类型 |

### WebGeoDB 特定错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `Schema not defined` | 表未定义 | 调用 `db.schema()` |
| `Invalid geometry type` | 几何类型无效 | 使用有效的 GeoJSON 几何类型 |
| `Index not found` | 索引不存在 | 先创建索引 |
| `Query execution failed` | 查询失败 | 检查查询语法和数据 |

---

## 总结

### 诊断流程

1. **检查浏览器支持**：确保浏览器支持 IndexedDB
2. **检查存储配额**：确保有足够的存储空间
3. **检查数据库状态**：确认数据库已正确打开
4. **验证数据**：确保数据格式正确
5. **检查索引**：确保创建了必要的索引
6. **分析性能**：使用开发者工具分析瓶颈
7. **查看错误日志**：检查控制台错误信息

### 获取帮助

如果以上方法都无法解决问题：

1. 查看完整错误信息
2. 记录复现步骤
3. 检查浏览器控制台
4. 查看 WebGeoDB 文档
5. 提交 Issue 到 GitHub

---

**相关文档**：
- [快速开始](./getting-started.md)
- [API 参考](./api/reference.md)
- [最佳实践](./best-practices.md)
- [性能优化](./performance.md)
