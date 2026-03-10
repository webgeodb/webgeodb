# WebGeoDB 教程示例 - 第3章: 性能优化

## 示例简介

本示例全面展示 WebGeoDB 的性能优化技巧，包括批量操作、索引优化、查询优化、缓存策略等，帮助您构建高性能的地理空间应用。

## 学习目标

1. 掌握批量操作的优化技巧
2. 理解索引策略对查询性能的影响
3. 学会使用缓存提升性能
4. 了解查询优化的最佳实践
5. 掌握性能监控和分析方法

## 前置要求

- Node.js >= 16
- TypeScript >= 4.5
- 完成第1-2章的学习

## 安装和运行

```bash
# 安装依赖
npm install

# 运行示例
npm start

# 编译TypeScript
npm run build
```

## 示例内容

### 1. 批量操作优化

#### ❌ 优化前: 单条插入

```typescript
// 慢速方式
for (let i = 0; i < 1000; i++) {
  await db.pois.add(createPOI(i));
}
// 耗时: ~1000ms
```

#### ✅ 优化后: 批量插入

```typescript
// 快速方式
const batchData = [];
for (let i = 0; i < 1000; i++) {
  batchData.push(createPOI(i));
}
await db.pois.bulkAdd(batchData);
// 耗时: ~100ms, 提升10x
```

**性能提升**: 10x

### 2. 索引优化

#### 创建索引

```typescript
// 为常用查询字段创建索引
db.pois.createIndex('category');
db.pois.createIndex('rating');
db.pois.createIndex('geometry', { auto: true });
```

#### 索引效果对比

```typescript
// ❌ 无索引: 全表扫描
const results = await db.pois
  .filter(poi => poi.category === 'restaurant')
  .toArray();
// 耗时: ~50ms

// ✅ 有索引: 索引查找
const results = await db.pois
  .where('category').equals('restaurant')
  .toArray();
// 耗时: ~1ms, 提升50x
```

**性能提升**: 50x

### 3. 查询优化

#### 使用 LIMIT 限制结果

```typescript
// ❌ 获取所有数据
const allResults = await db.pois
  .where('category').equals('restaurant')
  .toArray();

// ✅ 只需要的数据
const limitedResults = await db.pois
  .where('category').equals('restaurant')
  .limit(20)
  .toArray();
```

#### 使用 OFFSET + LIMIT 分页

```typescript
const pageSize = 20;
const pageNumber = 5;

const pagedResults = await db.pois
  .where('category').equals('restaurant')
  .offset(pageNumber * pageSize)
  .limit(pageSize)
  .toArray();
```

#### 使用复合条件

```typescript
// 利用索引 + 内存过滤
const results = await db.pois
  .where('category').equals('restaurant') // 使用索引
  .and(poi => poi.rating >= 4)            // 内存过滤
  .toArray();
```

### 4. 缓存策略

#### 简单缓存实现

```typescript
class SimpleCache {
  private cache = new Map();
  private ttl = 60000; // 1分钟

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

#### 使用缓存

```typescript
const cache = new SimpleCache();

async function getPois(category) {
  const cacheKey = `pois:${category}`;

  // 检查缓存
  let results = cache.get(cacheKey);
  if (results) return results;

  // 执行查询
  results = await db.pois
    .where('category').equals(category)
    .toArray();

  // 存入缓存
  cache.set(cacheKey, results);

  return results;
}
```

**性能提升**: 命中率 95% 时提升 20x

### 5. 多级缓存

```typescript
const l1Cache = new SimpleCache(5000);   // L1: 5秒
const l2Cache = new SimpleCache(30000);  // L2: 30秒

async function multiLevelQuery(category) {
  const key = `pois:${category}`;

  // L1 缓存
  if (l1Cache.has(key)) {
    return l1Cache.get(key);
  }

  // L2 缓存
  if (l2Cache.has(key)) {
    const data = l2Cache.get(key);
    l1Cache.set(key, data); // 提升到L1
    return data;
  }

  // 数据库查询
  const results = await db.pois
    .where('category').equals(category)
    .toArray();

  l2Cache.set(key, results);
  l1Cache.set(key, results);

  return results;
}
```

### 6. 性能监控

#### 性能监控工具

```typescript
class PerformanceMonitor {
  private metrics = [];

  start() {
    // 开始计时
  }

  end(operation, datasetSize) {
    const duration = /* 计算耗时 */;
    const metric = {
      operation,
      datasetSize,
      duration,
      recordsPerSecond: datasetSize / (duration / 1000)
    };
    this.metrics.push(metric);
    return metric;
  }

  printMetrics(title) {
    console.log(`\n📊 ${title}`);
    this.metrics.forEach(metric => {
      console.log(
        `${metric.operation}: ` +
        `${metric.duration}ms, ` +
        `${metric.recordsPerSecond.toFixed(0)} 记录/秒`
      );
    });
  }
}
```

#### 使用监控

```typescript
const monitor = new PerformanceMonitor();

monitor.start();
const results = await db.pois.toArray();
const metric = monitor.end('查询所有', results.length);

console.log(`查询速度: ${metric.recordsPerSecond} 记录/秒`);
```

## 性能测试结果

### 批量操作

| 操作 | 数据量 | 优化前 | 优化后 | 提升 |
|------|--------|--------|--------|------|
| 插入 | 1,000 | 1000ms | 100ms | 10x |
| 更新 | 1,000 | 800ms | 80ms | 10x |
| 删除 | 1,000 | 600ms | 60ms | 10x |

### 查询性能

| 查询类型 | 数据量 | 无索引 | 有索引 | 提升 |
|----------|--------|--------|--------|------|
| 点查询 | 10,000 | 50ms | 1ms | 50x |
| 范围查询 | 10,000 | 80ms | 2ms | 40x |
| 排序查询 | 10,000 | 120ms | 5ms | 24x |

### 缓存效果

| 场景 | 无缓存 | 有缓存 | 提升 |
|------|--------|--------|------|
| 热点查询 | 50ms | 2ms | 25x |
| 重复查询 | 50ms | 1ms | 50x |

## 优化建议

### 1. 数据导入优化

```typescript
// 批量导入大数据集
async function importLargeDataset(data) {
  const batchSize = 1000;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.pois.bulkAdd(batch);

    // 显示进度
    console.log(`已导入: ${i + batch.length}/${data.length}`);
  }
}
```

### 2. 索引策略

```typescript
// 为常用查询字段创建索引
db.pois.createIndex('category');   // 精确查询
db.pois.createIndex('rating');     // 范围查询
db.pois.createIndex('geometry');   // 空间查询

// 避免为低选择性字段创建索引
// db.pois.createIndex('status'); // ❌ 只有2-3个值
```

### 3. 查询优化

```typescript
// ✅ 好的查询
await db.pois
  .where('category').equals('restaurant')
  .and(poi => poi.rating >= 4)
  .limit(20)
  .toArray();

// ❌ 差的查询
await db.pois
  .filter(poi => {
    return poi.category === 'restaurant' && poi.rating >= 4;
  })
  .toArray();
```

### 4. 内存管理

```typescript
// 分批处理大数据集
async function processLargeDataset() {
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const batch = await db.pois
      .offset(offset)
      .limit(batchSize)
      .toArray();

    if (batch.length === 0) break;

    // 处理批次
    await processBatch(batch);

    offset += batchSize;

    // 释放内存
    if (global.gc) global.gc();
  }
}
```

### 5. 并发控制

```typescript
// 限制并发请求数
import pLimit from 'p-limit';

const limit = pLimit(5); // 最多5个并发

async function concurrentQueries() {
  const tasks = queries.map(query =>
    limit(() => executeQuery(query))
  );

  const results = await Promise.all(tasks);
  return results;
}
```

## 性能分析工具

### Chrome DevTools

1. 打开 Performance 标签
2. 录制操作过程
3. 分析火焰图
4. 找出性能瓶颈

### IndexedDB 检查

```javascript
// 在浏览器控制台
// 查看数据库大小
const request = indexedDB.open('your-db', 1);
request.onsuccess = () => {
  console.log('数据库大小:', request.result);
};
```

### 自定义性能日志

```typescript
class PerformanceLogger {
  log(operation, duration, metadata) {
    const log = {
      timestamp: Date.now(),
      operation,
      duration,
      metadata
    };

    // 存储到日志表
    db.performanceLogs.add(log);

    // 慢查询告警
    if (duration > 100) {
      console.warn(`慢查询: ${operation} 耗时 ${duration}ms`);
    }
  }
}
```

## 常见性能问题

### Q: 为什么查询很慢？

A: 检查以下几点：

1. 是否为查询字段创建了索引？
2. 是否使用了 LIMIT 限制结果？
3. 是否有复杂的计算或过滤？
4. 数据量是否过大？

### Q: 如何优化大量数据导入？

A: 使用批量操作 + 分批处理：

```typescript
const batchSize = 1000;
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  await db.table.bulkAdd(batch);
}
```

### Q: 缓存什么时候失效？

A: 常见策略：

1. **时间失效**: 固定时间后失效
2. **数据更新失效**: 数据更新时清除缓存
3. **LRU**: 缓存满时淘汰最少使用的
4. **手动失效**: 提供清除缓存的API

## 实际应用场景

### 实时地图应用

- 使用缓存减少数据库查询
- 批量加载地图数据
- 空间索引加速查询

### 数据分析

- 批量导入历史数据
- 聚合查询使用索引
- 分页处理大数据集

### 移动应用

- 离线缓存策略
- 减少同步次数
- 压缩数据大小

## 性能指标参考

### 查询性能

- 简单查询: < 10ms
- 复杂查询: < 100ms
- 批量查询: < 1s

### 写入性能

- 单条写入: < 5ms
- 批量写入(100): < 100ms
- 批量写入(1000): < 1s

### 缓存性能

- 缓存命中: < 1ms
- 缓存未命中: 10-50ms
- 命中率目标: > 90%

## 相关资源

- [IndexedDB 性能最佳实践](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Best_Practices)
- [Web性能优化指南](https://web.dev/performance/)
- [数据库索引原理](https://en.wikipedia.org/wiki/Database_index)

## 下一步

- 查看第4章: 实时数据同步
- 学习第5章: 离线优先应用
- 探索更多实战案例
