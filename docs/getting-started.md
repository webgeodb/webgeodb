# 快速开始

## 安装

```bash
# 使用 pnpm
pnpm add @webgeodb/core

# 使用 npm
npm install @webgeodb/core

# 使用 yarn
yarn add @webgeodb/core
```

## 基础使用

### 1. 创建数据库

```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB({
  name: 'my-geo-db',
  version: 1
});
```

### 2. 定义表结构

```typescript
db.schema({
  features: {
    id: 'string',
    name: 'string',
    type: 'string',
    geometry: 'geometry',
    properties: 'json'
  }
});
```

### 3. 打开数据库

```typescript
await db.open();
```

### 4. 创建空间索引

```typescript
db.features.createIndex('geometry', { auto: true });
```

## CRUD 操作

### 插入数据

```typescript
// 插入单条数据
await db.features.insert({
  id: '1',
  name: 'Point A',
  type: 'poi',
  geometry: {
    type: 'Point',
    coordinates: [30, 10]
  },
  properties: {
    category: 'restaurant',
    rating: 4.5
  }
});

// 批量插入
await db.features.insertMany([
  { id: '2', name: 'Point B', ... },
  { id: '3', name: 'Point C', ... }
]);
```

### 查询数据

```typescript
// 获取单条数据
const feature = await db.features.get('1');

// 获取所有数据
const all = await db.features.toArray();

// 条件查询
const results = await db.features
  .where('type', '=', 'restaurant')
  .toArray();
```

### 更新数据

```typescript
await db.features.update('1', {
  name: 'Point A Updated',
  properties: {
    rating: 4.8
  }
});
```

### 删除数据

```typescript
// 删除单条
await db.features.delete('1');

// 批量删除
await db.features.deleteMany(['1', '2', '3']);
```

## 查询操作

### 属性查询

```typescript
// 等于
const results = await db.features
  .where('type', '=', 'restaurant')
  .toArray();

// 大于
const results = await db.features
  .where('properties.rating', '>', 4.0)
  .toArray();

// 包含
const results = await db.features
  .where('type', 'in', ['restaurant', 'cafe'])
  .toArray();

// 多条件
const results = await db.features
  .where('type', '=', 'restaurant')
  .where('properties.rating', '>', 4.0)
  .toArray();
```

### 排序和分页

```typescript
// 排序
const results = await db.features
  .where('type', '=', 'restaurant')
  .orderBy('properties.rating', 'desc')
  .toArray();

// 分页
const results = await db.features
  .where('type', '=', 'restaurant')
  .offset(20)
  .limit(10)
  .toArray();
```

## 空间查询

### 距离查询

```typescript
// 查询 1km 范围内的要素
const results = await db.features
  .distance('geometry', [30, 10], '<', 1000)
  .toArray();
```

### 相交查询

```typescript
const polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [29, 9],
      [32, 9],
      [32, 12],
      [29, 12],
      [29, 9]
    ]
  ]
};

const results = await db.features
  .intersects('geometry', polygon)
  .toArray();
```

### 包含查询

```typescript
const results = await db.features
  .contains('geometry', point)
  .toArray();
```

### 在内部查询

```typescript
const results = await db.features
  .within('geometry', polygon)
  .toArray();
```

## SQL 查询 🆕

### 基础 SQL 查询

WebGeoDB 支持 PostgreSQL/PostGIS 兼容的 SQL 语法。

```typescript
// 简单查询
const results = await db.query(`
  SELECT * FROM features WHERE type = 'poi'
`);

// 参数化查询（PostgreSQL 风格）
const pois = await db.query(`
  SELECT * FROM features
  WHERE type = $1 AND rating >= $2
`, { params: ['restaurant', 4.0] });

// 排序和限制
const sorted = await db.query(`
  SELECT name, rating
  FROM features
  ORDER BY rating DESC
  LIMIT 10
`);
```

### PostGIS 空间查询

使用熟悉的 PostGIS 函数进行空间查询：

```typescript
// 距离查询
const nearby = await db.query(`
  SELECT * FROM features
  WHERE ST_DWithin(geometry, ST_MakePoint(30, 10), 1000)
`);

// 相交查询
const polygon = 'POLYGON((29 9, 32 9, 32 12, 29 12, 29 9))';
const intersects = await db.query(`
  SELECT * FROM features
  WHERE ST_Intersects(geometry, ST_GeomFromText($1))
`, { params: [polygon] });

// 缓冲区查询
const buffered = await db.query(`
  SELECT * FROM zones
  WHERE ST_Intersects(
    geometry,
    ST_Buffer(ST_MakePoint(30, 10), 500)
  )
`);
```

### 预编译语句

对于重复执行的查询，使用预编译语句提升性能：

```typescript
// 创建预编译语句
const stmt = db.prepare(`
  SELECT * FROM features WHERE type = $1 AND rating >= $2
`);

// 多次执行
const restaurants = await stmt.execute(['restaurant', 4.0]);
const cafes = await stmt.execute(['cafe', 4.5]);

// 分析查询计划
const plan = stmt.explain();
console.log('预估成本:', plan.estimatedCost);
console.log('使用索引:', plan.indexes);
```

### 链式 API vs SQL API

```typescript
// 链式 API（适合简单查询）
const chainResults = await db.features
  .where('type', '=', 'poi')
  .distance('geometry', [30, 10], '<', 1000)
  .orderBy('rating', 'desc')
  .limit(10)
  .toArray();

// SQL API（适合复杂查询）
const sqlResults = await db.query(`
  SELECT * FROM features
  WHERE type = 'poi'
    AND ST_DWithin(geometry, ST_MakePoint(30, 10), 1000)
  ORDER BY rating DESC
  LIMIT 10
`);
```

### 查询缓存

WebGeoDB 自动缓存 SQL 查询结果：

```typescript
// 首次查询（解析 + 执行）
const results1 = await db.query(`
  SELECT * FROM features WHERE type = 'poi'
`);

// 相同查询（直接返回缓存，极快）
const results2 = await db.query(`
  SELECT * FROM features WHERE type = 'poi'
`);

// 查看缓存统计
const stats = db.getQueryCacheStats();
console.log(`缓存命中率: ${(stats.hitRate * 100).toFixed(1)}%`);

// 手动清除缓存
db.invalidateQueryCache('features');
```

## 完整示例

```typescript
import { WebGeoDB } from '@webgeodb/core';

async function main() {
  // 创建数据库
  const db = new WebGeoDB({
    name: 'my-geo-db',
    version: 1
  });

  // 定义表结构
  db.schema({
    features: {
      id: 'string',
      name: 'string',
      type: 'string',
      geometry: 'geometry',
      properties: 'json'
    }
  });

  // 打开数据库
  await db.open();

  // 创建空间索引
  db.features.createIndex('geometry', { auto: true });

  // 插入数据
  await db.features.insertMany([
    {
      id: '1',
      name: 'Restaurant A',
      type: 'restaurant',
      geometry: { type: 'Point', coordinates: [30, 10] },
      properties: { rating: 4.5 }
    },
    {
      id: '2',
      name: 'Restaurant B',
      type: 'restaurant',
      geometry: { type: 'Point', coordinates: [31, 11] },
      properties: { rating: 4.0 }
    }
  ]);

  // 查询
  const results = await db.features
    .where('type', '=', 'restaurant')
    .where('properties.rating', '>', 4.2)
    .orderBy('properties.rating', 'desc')
    .limit(10)
    .toArray();

  console.log(results);

  // 关闭数据库
  await db.close();
}

main().catch(console.error);
```

## 下一步

- [API 参考](./api/reference.md) - 完整的 API 文档
- [迁移指南](./guides/migration.md) - 从其他数据库迁移
- [自定义引擎开发](./guides/custom-engine.md) - 开发自定义空间引擎
- [性能优化](./guides/performance.md) - 性能优化指南（待编写）
- [最佳实践](./guides/best-practices.md) - 使用最佳实践（待编写）
