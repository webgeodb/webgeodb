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
