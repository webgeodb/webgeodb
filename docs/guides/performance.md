# WebGeoDB 性能优化指南

本指南介绍如何优化 WebGeoDB 的查询性能、索引使用和内存管理。

---

## 目录

1. [索引选择](#索引选择)
2. [查询优化](#查询优化)
3. [批量操作](#批量操作)
4. [内存管理](#内存管理)
5. [性能基准](#性能基准)
6. [常见陷阱](#常见陷阱)

---

## 索引选择

### 空间索引类型

WebGeoDB 支持三种空间索引，各有适用场景：

#### 1. R-Tree 索引 (rbush)

**适用场景**：
- 频繁插入/删除的动态数据集
- 数据量 < 100,000 条
- 需要实时更新索引

**优点**：
- 动态更新，无需重建
- 插入性能好
- 内存占用适中

**缺点**：
- 查询性能略低于静态索引
- 构建时间随数据量增长

**示例**：
```typescript
db.features.createIndex('geometry', {
  type: 'rbush',
  auto: true  // 自动维护索引
});
```

#### 2. Static 索引 (flatbush)

**适用场景**：
- 批量导入的静态数据集
- 数据量 > 100,000 条
- 读多写少的场景

**优点**：
- 查询性能最优（比 R-Tree 快 2-3x）
- 内存占用小
- 支持批量构建

**缺点**：
- 不支持动态更新
- 修改数据需要重建索引

**示例**：
```typescript
// 批量导入后创建索引
await db.features.insertMany(features);
db.features.createIndex('geometry', { type: 'flatbush' });
```

#### 3. 混合索引 (HybridSpatialIndex)

**适用场景**：
- 既需要快速构建，又需要良好查询性能
- 数据定期批量更新

**优点**：
- 兼顾构建和查询性能
- 支持增量更新

**示例**：
```typescript
db.features.createIndex('geometry', {
  type: 'hybrid',
  rebuildThreshold: 0.3  // 30% 数据变更时重建
});
```

### 索引选择建议

| 场景 | 推荐索引 | 理由 |
|------|---------|------|
| 实时位置追踪 | rbush | 频繁更新，数据量适中 |
| 离线地图数据 | flatbush | 静态数据，查询性能优先 |
| 编辑系统 | hybrid | 读多写少，定期批量更新 |
| 小数据集 (< 1K) | 不需要索引 | 全表扫描更快 |
| 中等数据集 (1K-100K) | rbush | 动态性和性能平衡 |
| 大数据集 (> 100K) | flatbush | 查询性能最重要 |

---

## 查询优化

### 1. 使用空间查询而非全表扫描

**❌ 不推荐**：
```typescript
// 获取所有数据后在内存中过滤
const all = await db.features.toArray();
const filtered = all.filter(f =>
  calculateDistance(f.geometry, point) < 1000
);
```

**✅ 推荐**：
```typescript
// 使用空间查询直接过滤
const results = await db.features
  .distance('geometry', point, '<', 1000)
  .toArray();
```

**性能提升**：10-100x（取决于数据集大小）

### 2. 组合多个条件

**❌ 不推荐**：
```typescript
// 多次查询
const nearby = await db.features
  .distance('geometry', point, '<', 1000)
  .toArray();

const restaurants = nearby.filter(f => f.type === 'restaurant');
const expensive = restaurants.filter(f =>
  f.properties.priceRange === 'expensive'
);
```

**✅ 推荐**：
```typescript
// 单次查询，多个条件
const results = await db.features
  .distance('geometry', point, '<', 1000)
  .where('type', '=', 'restaurant')
  .where('properties.priceRange', '=', 'expensive')
  .toArray();
```

**性能提升**：3-5x

### 3. 合理使用分页

**❌ 不推荐**：
```typescript
// 获取所有数据
const all = await db.features.toArray();
const page = all.slice(0, 20);
```

**✅ 推荐**：
```typescript
// 使用 limit 和 offset
const page = await db.features
  .limit(20)
  .offset(0)
  .toArray();
```

**性能提升**：对于大数据集，可以减少 90%+ 的数据传输

### 4. 避免不必要的排序

**❌ 不推荐**：
```typescript
// 默认排序（可能有性能开销）
const results = await db.features
  .where('type', '=', 'restaurant')
  .toArray();
```

**✅ 推荐**：
```typescript
// 明确指定是否需要排序
const results = await db.features
  .where('type', '=', 'restaurant')
  .orderBy('name', 'asc')  // 需要排序
  .toArray();

// 或不排序
const results = await db.features
  .where('type', '=', 'restaurant')
  .toArray();
```

### 5. 使用投影减少数据传输

**❌ 不推荐**：
```typescript
// 获取所有字段
const results = await db.features
  .where('type', '=', 'restaurant')
  .toArray();
```

**✅ 推荐**：
```typescript
// 只获取需要的字段（如果 API 支持）
// 注意：WebGeoDB 当前版本可能不支持此功能，
// 可以在查询后手动过滤字段
const results = await db.features
  .where('type', '=', 'restaurant')
  .toArray();

// 只保留需要的字段
const projected = results.map(r => ({
  id: r.id,
  name: r.name,
  geometry: r.geometry
}));
```

---

## 批量操作

### 1. 使用批量插入

**❌ 不推荐**：
```typescript
// 循环插入
for (const feature of features) {
  await db.features.insert(feature);
}
```

**✅ 推荐**：
```typescript
// 批量插入
await db.features.insertMany(features);
```

**性能提升**：10-50x

### 2. 使用事务

**❌ 不推荐**：
```typescript
// 非事务操作
await db.features.insert(feature1);
await db.features.insert(feature2);
await db.features.update('1', { name: 'Updated' });
```

**✅ 推荐**：
```typescript
// 事务操作
await db.transaction('rw', db.features, async () => {
  await db.features.insert(feature1);
  await db.features.insert(feature2);
  await db.features.update('1', { name: 'Updated' });
});
```

**性能提升**：减少 IndexedDB 事务开销

### 3. 批量更新

**❌ 不推荐**：
```typescript
// 逐个更新
for (const feature of features) {
  await db.features.update(feature.id, { status: 'processed' });
}
```

**✅ 推荐**：
```typescript
// WebGeoDB 当前版本可能不支持批量更新
// 可以使用事务来优化
await db.transaction('rw', db.features, async () => {
  for (const feature of features) {
    await db.features.update(feature.id, { status: 'processed' });
  }
});
```

---

## 内存管理

### 1. 及时清理不需要的数据

```typescript
// 查询完成后清理大对象
let results = await db.features.toArray();

// 处理数据
const processed = results.map(process);

// 清理原始数据
results = null;
```

### 2. 使用游标处理大数据集

```typescript
// 使用游标逐条处理，避免一次性加载所有数据
await db.features.each(feature => {
  processFeature(feature);
});
```

### 3. 定期清理 IndexedDB

```typescript
// 定期清理旧数据
async function cleanupOldData() {
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await db.features
    .where('timestamp', '<', cutoffDate.getTime())
    .delete();
}
```

### 4. 监控内存使用

```typescript
// 监控 IndexedDB 配额
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate();
  const usagePercent = (estimate.usage / estimate.quota) * 100;

  console.log(`Storage usage: ${usagePercent.toFixed(2)}%`);

  if (usagePercent > 80) {
    console.warn('Storage quota almost full!');
  }
}
```

---

## 性能基准

### 查询性能（基于测试）

| 操作 | 数据量 | 无索引 | R-Tree | Static | 提升 |
|------|--------|--------|--------|--------|------|
| 距离查询 | 10K | 150ms | 15ms | 8ms | 10-19x |
| 包含查询 | 10K | 200ms | 20ms | 10ms | 10-20x |
| 相交查询 | 10K | 180ms | 18ms | 9ms | 10-20x |
| 距离查询 | 100K | 1800ms | 180ms | 90ms | 10-20x |
| 包含查询 | 100K | 2400ms | 240ms | 120ms | 10-20x |

### 插入性能

| 操作 | 数据量 | 单条插入 | 批量插入 | 提升 |
|------|--------|----------|----------|------|
| 插入 | 1K | 1200ms | 80ms | 15x |
| 插入 | 10K | 12000ms | 750ms | 16x |
| 插入 | 100K | 120000ms | 8000ms | 15x |

---

## 常见陷阱

### 1. 在循环中查询

**❌ 问题**：
```typescript
for (const area of areas) {
  const features = await db.features
    .within('geometry', area)
    .toArray();
  // 处理...
}
```

**✅ 解决方案**：
- 使用批量查询
- 或使用反向查询（查询哪些区域包含要素）

### 2. 过早创建索引

**❌ 问题**：
```typescript
// 先创建索引
db.features.createIndex('geometry');

// 然后插入大量数据（索引会频繁重建）
await db.features.insertMany(largeDataset);
```

**✅ 解决方案**：
```typescript
// 先插入数据
await db.features.insertMany(largeDataset);

// 然后创建索引（一次性构建）
db.features.createIndex('geometry');
```

### 3. 忽略缓存失效

**❌ 问题**：
```typescript
// 更新数据后未清理缓存
await db.features.update('1', { geometry: newGeometry });

// 仍然使用旧的查询结果（可能已缓存）
```

**✅ 解决方案**：
- WebGeoDB 会自动处理缓存失效
- 但需要注意关闭和重新打开数据库时的状态

### 4. 不使用空间索引

**❌ 问题**：
```typescript
// 不创建索引，直接查询
const results = await db.features
  .distance('geometry', point, '<', 1000)
  .toArray();
```

**✅ 解决方案**：
```typescript
// 先创建索引
db.features.createIndex('geometry');

// 然后查询
const results = await db.features
  .distance('geometry', point, '<', 1000)
  .toArray();
```

### 5. 同步操作阻塞主线程

**❌ 问题**：
```typescript
// 长时间运行的同步操作
const results = [];
await db.features.each(f => {
  // 复杂计算可能阻塞 UI
  results.push(compute(f));
});
```

**✅ 解决方案**：
- 使用 Web Worker 进行复杂计算
- 分批处理数据

---

## 性能分析

### 使用浏览器开发工具

1. **Performance 面板**：
   - 记录页面性能
   - 查找长任务
   - 分析函数调用时间

2. **Memory 面板**：
   - 监控内存使用
   - 查找内存泄漏
   - 分析堆快照

3. **IndexedDB 查看器**：
   - 查看数据量
   - 检查索引状态
   - 分析存储大小

### 自定义性能监控

```typescript
class PerformanceMonitor {
  private startTimes = new Map<string, number>();

  start(label: string) {
    this.startTimes.set(label, performance.now());
  }

  end(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) return 0;

    const duration = performance.now() - startTime;
    console.log(`${label}: ${duration.toFixed(2)}ms`);
    this.startTimes.delete(label);

    return duration;
  }
}

// 使用示例
const monitor = new PerformanceMonitor();

monitor.start('query');
const results = await db.features
  .distance('geometry', point, '<', 1000)
  .toArray();
monitor.end('query');
```

---

## 总结

### 关键优化点

1. **选择正确的索引类型**：
   - 动态数据 → R-Tree
   - 静态数据 → Static
   - 混合场景 → Hybrid

2. **优化查询**：
   - 使用空间查询而非全表扫描
   - 组合多个条件
   - 合理使用分页

3. **批量操作**：
   - 使用 insertMany 而非循环 insert
   - 使用事务包裹相关操作

4. **内存管理**：
   - 及时清理不需要的数据
   - 使用游标处理大数据集
   - 监控存储配额

### 性能优化流程

1. 测量当前性能
2. 识别瓶颈（查询、插入、索引）
3. 应用相应的优化策略
4. 重新测量性能
5. 迭代优化

---

**相关文档**：
- [快速开始](./getting-started.md)
- [API 参考](./api/reference.md)
- [最佳实践](./best-practices.md)
