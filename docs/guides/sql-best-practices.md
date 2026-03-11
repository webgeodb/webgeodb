# SQL 最佳实践指南

本文档提供 WebGeoDB SQL 查询的最佳实践建议，帮助你写出高效、可维护的 SQL 代码。

## 目录

- [查询性能优化](#查询性能优化)
- [索引使用策略](#索引使用策略)
- [缓存最佳实践](#缓存最佳实践)
- [安全性建议](#安全性建议)
- [可读性提升](#可读性提升)
- [常见问题解决](#常见问题解决)

---

## 查询性能优化

### 1. 使用参数化查询

始终使用参数化查询防止 SQL 注入并提升缓存效率：

```typescript
// ❌ 不好：字符串拼接，无法缓存，有注入风险
const sql = `SELECT * FROM features WHERE type = '${userInput}'`;

// ✅ 好：参数化查询，安全且可缓存
const results = await db.query(`
  SELECT * FROM features WHERE type = $1
`, { params: [userInput] });
```

**原因：**
- 参数化查询会被自动缓存，相同结构的查询可以复用
- 防止 SQL 注入攻击
- 数据库可以优化查询计划

### 2. 只查询需要的字段

避免使用 `SELECT *`，只查询需要的字段：

```typescript
// ❌ 不好：返回所有字段
const results = await db.query(`
  SELECT * FROM features WHERE type = 'poi'
`);

// ✅ 好：只查询需要的字段
const results = await db.query(`
  SELECT id, name, rating FROM features WHERE type = 'poi'
`);
```

**性能提升：** 减少 20-50% 的数据传输量。

### 3. 合理使用 LIMIT

始终使用 LIMIT 限制结果数量：

```typescript
// ❌ 不好：可能返回百万级数据
const results = await db.query(`
  SELECT * FROM features WHERE rating > 4
`);

// ✅ 好：限制返回数量
const results = await db.query(`
  SELECT * FROM features WHERE rating > 4 LIMIT 100
`);
```

### 4. 空间查询优化

使用 ST_DWithin 而非 ST_Distance 进行距离判断：

```typescript
// ❌ 不好：计算所有点的实际距离
const results = await db.query(`
  SELECT * FROM features
  WHERE ST_Distance(geometry, ST_MakePoint(116.4, 39.9)) < 1000
`);

// ✅ 好：使用索引优化的距离判断
const results = await db.query(`
  SELECT * FROM features
  WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
`);
```

**原因：** ST_DWithin 可以利用空间索引，性能提升 10-100 倍。

### 5. 避免在 WHERE 中使用函数

```typescript
// ❌ 不好：每行都要计算函数
const results = await db.query(`
  SELECT * FROM features
  WHERE LOWER(type) = 'restaurant'
`);

// ✅ 好：直接比较
const results = await db.query(`
  SELECT * FROM features
  WHERE type = 'restaurant'
`);
```

---

## 索引使用策略

### 1. 为常用查询字段创建索引

```typescript
// 为经常查询的字段创建索引
db.features.createIndex('type');
db.features.createIndex('properties.rating');

// 为几何字段创建空间索引
db.features.createIndex('geometry', { type: 'rbush' });
```

### 2. 复合索引策略

对于经常一起查询的字段，考虑查询顺序：

```typescript
// 如果经常这样查询：
// WHERE type = 'restaurant' AND rating > 4
// 则创建索引时把 type 放在前面
```

### 3. 监控索引使用情况

```typescript
const plan = db.explain(`
  SELECT * FROM features WHERE type = $1
`);
console.log('使用索引:', plan.indexes);
```

---

## 缓存最佳实践

### 1. 利用自动缓存

WebGeoDB 自动缓存参数化查询：

```typescript
// 第一次查询：解析 + 执行 + 缓存
const results1 = await db.query(`
  SELECT * FROM features WHERE type = $1
`, { params: ['poi'] });

// 第二次查询：直接返回缓存（极快）
const results2 = await db.query(`
  SELECT * FROM features WHERE type = $1
`, { params: ['restaurant'] });
```

### 2. 预编译重复查询

对于需要执行多次的查询，使用预编译语句：

```typescript
// ✅ 好：只解析一次
const stmt = db.prepare(`
  SELECT * FROM features WHERE type = $1 AND rating >= $2
`);

for (const type of ['restaurant', 'cafe', 'bar']) {
  const results = await stmt.execute([type, 4.0]);
  // 处理结果...
}
```

### 3. 合理的缓存失效

数据变更后及时使缓存失效：

```typescript
// 插入数据后
await db.features.insert(newData);
db.invalidateQueryCache('features');

// 批量更新后
await db.features.bulkUpdate(updates);
db.invalidateQueryCache('features');
```

### 4. 监控缓存效果

```typescript
const stats = db.getQueryCacheStats();
console.log(`
  缓存大小: ${stats.size}/${stats.maxSize}
  命中次数: ${stats.hits}
  未命中: ${stats.misses}
  命中率: ${(stats.hitRate * 100).toFixed(1)}%
`);

// 目标命中率：> 30%
// 如果低于 30%，考虑调整查询模式
```

---

## 安全性建议

### 1. 永远使用参数化查询

```typescript
// ❌ 危险：SQL 注入风险
const userInput = "'; DROP TABLE features; --";
const sql = `SELECT * FROM features WHERE type = '${userInput}'`;

// ✅ 安全：参数化查询
const results = await db.query(`
  SELECT * FROM features WHERE type = $1
`, { params: [userInput] });
```

### 2. 验证输入参数

```typescript
function searchFeatures(type: string, rating: number) {
  // 验证参数
  if (!['restaurant', 'cafe', 'bar'].includes(type)) {
    throw new Error('Invalid type');
  }
  if (rating < 0 || rating > 5) {
    throw new Error('Invalid rating');
  }

  // 执行查询
  return db.query(`
    SELECT * FROM features WHERE type = $1 AND rating >= $2
  `, { params: [type, rating] });
}
```

### 3. 限制查询结果数量

```typescript
// 始终设置 LIMIT 和合理的上限
function safeSearch(query: string, maxLimit = 1000) {
  const limit = Math.min(maxLimit, 1000);
  return db.query(`
    SELECT * FROM features WHERE name LIKE $1 LIMIT $2
  `, { params: [`${query}%`, limit] });
}
```

---

## 可读性提升

### 1. 使用一致的格式化

```typescript
// ❌ 不好：格式混乱
const results = await db.query('select * from features where type=$1 and rating>4 limit 10');

// ✅ 好：格式清晰
const results = await db.query(`
  SELECT *
  FROM features
  WHERE type = $1
    AND rating > 4
  LIMIT 10
`, { params: ['poi'] });
```

### 2. 有意义的别名

```typescript
// ❌ 不好：无意义别名
const results = await db.query(`
  SELECT a.name, b.type
  FROM features AS a
  JOIN categories AS b ON a.cat_id = b.id
`);

// ✅ 好：清晰别名
const results = await db.query(`
  SELECT f.name, c.type
  FROM features AS f
  JOIN categories AS c ON f.category_id = c.id
`);
```

### 3. 拆分复杂查询

```typescript
// ❌ 不好：一次性查询太复杂
const results = await db.query(`
  SELECT * FROM features
  WHERE type IN (SELECT type FROM categories WHERE popular = true)
    AND rating > (SELECT AVG(rating) FROM features)
    AND ST_DWithin(...)
`);

// ✅ 好：拆分为多个步骤
const popularTypes = await db.query(`
  SELECT type FROM categories WHERE popular = true
`);
const avgRating = await db.query(`
  SELECT AVG(rating) as avg FROM features
`);
const results = await db.query(`
  SELECT * FROM features
  WHERE type = ANY($1)
    AND rating > $2
    AND ST_DWithin(geometry, $3, $4)
`, { params: [popularTypes, avgRating, point, distance] });
```

### 4. 使用 CTE (Common Table Expressions)

虽然 WebGeoDB 不直接支持 CTE，但可以在代码中组织逻辑：

```typescript
// 模拟 CTE 的清晰结构
const highRatedFeatures = await db.query(`
  SELECT * FROM features WHERE rating >= 4
`);

const nearby = await db.query(`
  SELECT *
  FROM (
    SELECT * FROM features WHERE rating >= 4
  ) AS high_rated
  WHERE ST_DWithin(geometry, $1, 1000)
`, { params: [point] });
```

---

## 常见问题解决

### 问题 1：查询太慢

**诊断：**
```typescript
const plan = db.explain('SELECT * FROM features WHERE type = $1');
console.log('预估成本:', plan.estimatedCost);
console.log('使用索引:', plan.indexes);
```

**解决方案：**
- 添加索引
- 使用 LIMIT 限制结果
- 使用 ST_DWithin 替代 ST_Distance
- 只查询需要的字段

### 问题 2：缓存命中率低

**诊断：**
```typescript
const stats = db.getQueryCacheStats();
console.log('命中率:', stats.hitRate);
```

**解决方案：**
- 使用参数化查询而非字符串拼接
- 使用预编译语句处理重复查询
- 检查是否有频繁的动态 SQL 构建

### 问题 3：内存占用过高

**解决方案：**
```typescript
// 设置合理的缓存大小
// （在 WebGeoDB 配置中）
const db = new WebGeoDB({
  name: 'my-db',
  queryCache: {
    maxSize: 100 // 限制缓存条目数
  }
});

// 定期清理缓存
db.invalidateQueryCache();
```

### 问题 4：空间查询不准确

**原因：** Turf.js 使用近似计算

**解决方案：**
```typescript
// 了解引擎能力
const engine = EngineRegistry.getDefaultEngine();
console.log('精度:', engine.capabilities.precision);

// 如果需要精确计算，考虑加载 JSTS
import { loadJTSEngine } from '@webgeodb/core';
const jstsEngine = await loadJTSEngine();
if (jstsEngine) {
  EngineRegistry.register(jstsEngine);
  EngineRegistry.setDefaultEngine('jsts');
}
```

---

## 性能基准

### 合理的性能指标

| 查询类型 | 预期时间 | 优化后 |
|---------|---------|--------|
| 简单属性查询 | < 100ms | < 10ms |
| 空间距离查询 | < 1s | < 100ms |
| 复杂多条件查询 | < 2s | < 500ms |
| 缓存命中查询 | N/A | < 5ms |

### 性能测试模板

```typescript
async function benchmarkQuery(sql: string, params?: any[], iterations = 100) {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await db.query(sql, { params });
    times.push(performance.now() - start);
  }

  const avg = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`
    平均: ${avg.toFixed(2)}ms
    最小: ${min.toFixed(2)}ms
    最大: ${max.toFixed(2)}ms
  `);

  return { avg, min, max };
}

// 使用示例
await benchmarkQuery(`
  SELECT * FROM features
  WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
  LIMIT 10
`);
```

---

## 检查清单

在提交 SQL 代码前，检查以下项目：

- [ ] 是否使用了参数化查询？
- [ ] 是否设置了 LIMIT？
- [ ] 是否只查询需要的字段？
- [ ] 空间查询是否使用了 ST_DWithin？
- [ ] 是否为常用查询字段创建了索引？
- [ ] 是否使用了预编译语句处理重复查询？
- [ ] 查询格式是否清晰可读？
- [ ] 是否验证了输入参数？
- [ ] 是否检查了查询计划？
- [ ] 是否测试了查询性能？

---

## 参考资源

- [SQL 使用指南](../packages/core/docs/sql-guide.md) - 完整的 SQL 功能说明
- [迁移指南](../packages/core/docs/sql-migration-guide.md) - 从链式 API 迁移
- [API 参考](./api/reference.md) - 完整的 API 文档
- [性能优化指南](./guides/performance.md) - 通用性能优化建议
