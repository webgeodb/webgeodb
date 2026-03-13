# WebGeoDB 快速开始指南

本指南将帮助您在 5 分钟内开始使用 WebGeoDB。

---

## 目录

1. [安装和设置](#安装和设置) (5 分钟)
2. [创建第一个数据库](#创建第一个数据库) (5 分钟)
3. [CRUD 操作](#crud-操作) (10 分钟)
4. [空间查询](#空间查询) (10 分钟)
5. [SQL 查询](#sql-查询) (10 分钟)
6. [性能监控](#性能监控) (5 分钟)

---

## 安装和设置

### 1. 安装核心包

```bash
# 使用 npm
npm install webgeodb-core@beta

# 使用 pnpm
pnpm add webgeodb-core@beta

# 使用 yarn
yarn add webgeodb-core@beta
```

### 2. 导入到项目

```typescript
// ES Module
import { WebGeoDB } from 'webgeodb-core';

// CommonJS
const { WebGeoDB } = require('webgeodb-core');
```

### 3. 浏览器兼容性检查

```typescript
// 检查浏览器是否支持 IndexedDB
if (!window.indexedDB) {
  console.error('您的浏览器不支持 IndexedDB');
  // 使用降级方案
}
```

**支持的浏览器**：
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## 创建第一个数据库

### 1. 创建数据库实例

```typescript
import { WebGeoDB } from 'webgeodb-core';

// 创建数据库实例
const db = new WebGeoDB('my-geo-db');

// 打开数据库
await db.open();

console.log('数据库已打开！');
```

### 2. 定义表结构

```typescript
// 创建 features 表
await db.createTable('features', {
  id: 'number',           // 主键
  name: 'string',         // 名称
  type: 'string',         // 类型
  geometry: 'geometry',   // 几何对象
  properties: 'object'    // 其他属性
});

console.log('表已创建！');
```

### 3. 完整示例

```typescript
import { WebGeoDB } from 'webgeodb-core';

async function initDatabase() {
  // 创建数据库
  const db = new WebGeoDB('my-geo-db');

  try {
    // 打开数据库
    await db.open();
    console.log('✅ 数据库已打开');

    // 创建表
    await db.createTable('features', {
      id: 'number',
      name: 'string',
      type: 'string',
      geometry: 'geometry',
      properties: 'object'
    });
    console.log('✅ 表已创建');

    return db;
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

// 使用
const db = await initDatabase();
```

---

## CRUD 操作

### 1. 插入数据 (Create)

#### 插入单条数据

```typescript
// 插入一个餐厅
await db.insert('features', {
  id: 1,
  name: '北京烤鸭店',
  type: 'restaurant',
  geometry: {
    type: 'Point',
    coordinates: [116.4074, 39.9042]  // [经度, 纬度]
  },
  properties: {
    rating: 4.5,
    price: 150,
    cuisine: '中餐'
  }
});

console.log('✅ 数据已插入');
```

#### 批量插入

```typescript
const restaurants = [
  {
    id: 2,
    name: '川菜馆',
    type: 'restaurant',
    geometry: { type: 'Point', coordinates: [116.4100, 39.9050] },
    properties: { rating: 4.2, price: 80, cuisine: '川菜' }
  },
  {
    id: 3,
    name: '日料店',
    type: 'restaurant',
    geometry: { type: 'Point', coordinates: [116.4120, 39.9060] },
    properties: { rating: 4.8, price: 200, cuisine: '日料' }
  }
];

await db.insertMany('features', restaurants);
console.log('✅ 批量插入完成');
```

### 2. 查询数据 (Read)

#### 查询所有数据

```typescript
const allFeatures = await db.table('features').toArray();
console.log(`共有 ${allFeatures.length} 条数据`);
```

#### 条件查询

```typescript
// 查询所有餐厅
const restaurants = await db.table('features')
  .where('type', '=', 'restaurant')
  .toArray();

console.log(`找到 ${restaurants.length} 家餐厅`);
```

#### 复杂查询

```typescript
// 查询评分 >= 4.5 的高价餐厅
const highEndRestaurants = await db.table('features')
  .where('type', '=', 'restaurant')
  .where('properties.rating', '>=', 4.5)
  .where('properties.price', '>', 100)
  .toArray();

console.log('高端餐厅:', highEndRestaurants);
```

### 3. 更新数据 (Update)

```typescript
// 更新餐厅评分
await db.update('features', 1, {
  properties: {
    rating: 4.7,
    price: 150,
    cuisine: '中餐'
  }
});

console.log('✅ 数据已更新');
```

### 4. 删除数据 (Delete)

#### 删除单条数据

```typescript
await db.delete('features', 1);
console.log('✅ 数据已删除');
```

#### 批量删除

```typescript
// 删除所有评分低于 4.0 的餐厅
const lowRatedIds = await db.table('features')
  .where('properties.rating', '<', 4.0)
  .toArray()
  .then(items => items.map(item => item.id));

await db.deleteMany('features', lowRatedIds);
console.log(`✅ 已删除 ${lowRatedIds.length} 条数据`);
```

---

## 空间查询

### 1. 相交查询 (Intersects)

```typescript
// 定义一个矩形区域
const bbox = {
  type: 'Polygon',
  coordinates: [[
    [116.40, 39.90],  // 左下角
    [116.42, 39.90],  // 右下角
    [116.42, 39.92],  // 右上角
    [116.40, 39.92],  // 左上角
    [116.40, 39.90]   // 闭合
  ]]
};

// 查询区域内的所有餐厅
const nearbyRestaurants = await db.table('features')
  .where('type', '=', 'restaurant')
  .intersects('geometry', bbox)
  .toArray();

console.log(`区域内有 ${nearbyRestaurants.length} 家餐厅`);
```

### 2. 距离查询 (Distance)

```typescript
// 查询距离某点 1000 米内的餐厅
const myLocation = [116.4074, 39.9042];  // [经度, 纬度]

const nearbyRestaurants = await db.table('features')
  .where('type', '=', 'restaurant')
  .distance('geometry', myLocation, '<', 1000)  // 单位：米
  .toArray();

console.log(`附近 1km 内有 ${nearbyRestaurants.length} 家餐厅`);
```

### 3. 包含查询 (Contains)

```typescript
// 查询包含某个点的多边形
const point = {
  type: 'Point',
  coordinates: [116.4074, 39.9042]
};

const containingPolygons = await db.table('features')
  .where('type', '=', 'zone')
  .contains('geometry', point)
  .toArray();

console.log(`该点位于 ${containingPolygons.length} 个区域内`);
```

### 4. 在内部查询 (Within)

```typescript
// 查询完全在某个区域内的要素
const largeArea = {
  type: 'Polygon',
  coordinates: [[
    [116.35, 39.85],
    [116.45, 39.85],
    [116.45, 39.95],
    [116.35, 39.95],
    [116.35, 39.85]
  ]]
};

const featuresWithin = await db.table('features')
  .within('geometry', largeArea)
  .toArray();

console.log(`区域内有 ${featuresWithin.length} 个要素`);
```

### 5. 排序和分页

```typescript
// 按评分排序，获取前 10 个
const topRestaurants = await db.table('features')
  .where('type', '=', 'restaurant')
  .orderBy('properties.rating', 'desc')
  .limit(10)
  .toArray();

console.log('Top 10 餐厅:', topRestaurants);

// 分页查询
const page2 = await db.table('features')
  .where('type', '=', 'restaurant')
  .orderBy('properties.rating', 'desc')
  .offset(10)
  .limit(10)
  .toArray();

console.log('第 2 页:', page2);
```

---

## SQL 查询

WebGeoDB 支持 PostgreSQL/PostGIS 兼容的 SQL 查询。

### 1. 简单查询

```typescript
// 查询所有餐厅
const restaurants = await db.query(`
  SELECT * FROM features WHERE type = 'restaurant'
`);

console.log(`找到 ${restaurants.length} 家餐厅`);
```

### 2. 参数化查询

```typescript
// 使用 PostgreSQL 风格的参数占位符 ($1, $2, ...)
const highRatedRestaurants = await db.query(`
  SELECT * FROM features
  WHERE type = $1 AND properties.rating >= $2
`, ['restaurant', 4.5]);

console.log('高评分餐厅:', highRatedRestaurants);
```

### 3. PostGIS 空间查询

#### ST_Intersects - 相交查询

```typescript
const nearbyPOIs = await db.query(`
  SELECT * FROM features
  WHERE ST_Intersects(
    geometry,
    ST_GeomFromText('POLYGON((116.40 39.90, 116.42 39.90, 116.42 39.92, 116.40 39.92, 116.40 39.90))')
  )
`);

console.log('区域内的 POI:', nearbyPOIs);
```

#### ST_DWithin - 距离查询

```typescript
const nearbyRestaurants = await db.query(`
  SELECT * FROM features
  WHERE type = $1
    AND ST_DWithin(geometry, ST_MakePoint($2, $3), $4)
`, ['restaurant', 116.4074, 39.9042, 1000]);

console.log('附近的餐厅:', nearbyRestaurants);
```

#### ST_Contains - 包含查询

```typescript
const zones = await db.query(`
  SELECT * FROM features
  WHERE type = 'zone'
    AND ST_Contains(geometry, ST_MakePoint($1, $2))
`, [116.4074, 39.9042]);

console.log('包含该点的区域:', zones);
```

### 4. 聚合查询

```typescript
// 统计每种类型的数量
const stats = await db.query(`
  SELECT type, COUNT(*) as count
  FROM features
  GROUP BY type
`);

console.log('统计结果:', stats);

// 计算平均评分
const avgRating = await db.query(`
  SELECT AVG(properties.rating) as avg_rating
  FROM features
  WHERE type = 'restaurant'
`);

console.log('平均评分:', avgRating[0].avg_rating);
```

### 5. 排序和分页

```typescript
// 按评分排序，获取前 10 个
const topRestaurants = await db.query(`
  SELECT * FROM features
  WHERE type = 'restaurant'
  ORDER BY properties.rating DESC
  LIMIT 10
`);

console.log('Top 10 餐厅:', topRestaurants);

// 分页查询
const page2 = await db.query(`
  SELECT * FROM features
  WHERE type = 'restaurant'
  ORDER BY properties.rating DESC
  LIMIT 10 OFFSET 10
`);

console.log('第 2 页:', page2);
```

### 6. 预编译语句

```typescript
// 创建预编译语句
const stmt = db.prepare(`
  SELECT * FROM features
  WHERE type = $1 AND properties.rating >= $2
`);

// 多次执行
const highRated = await stmt.execute(['restaurant', 4.5]);
const topRated = await stmt.execute(['restaurant', 5.0]);

console.log('高评分:', highRated.length);
console.log('满分:', topRated.length);
```

---

## 性能监控

WebGeoDB 提供内置的性能监控功能。

### 1. 启用性能分析

```typescript
// 启用性能分析
await db.enableProfiling(true);

console.log('✅ 性能分析已启用');
```

### 2. 获取性能统计

```typescript
// 执行一些查询
await db.table('features')
  .where('type', '=', 'restaurant')
  .toArray();

// 获取统计信息
const stats = await db.getStats();

console.log('性能统计:');
console.log(`- 查询次数: ${stats.queryCount}`);
console.log(`- 平均查询时间: ${stats.avgQueryTime.toFixed(2)}ms`);
console.log(`- 索引命中率: ${(stats.indexHitRate * 100).toFixed(1)}%`);
console.log(`- 缓存命中率: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
```

### 3. 查看慢查询

```typescript
// 获取执行时间超过 100ms 的查询
const slowQueries = await db.getSlowQueries(100);

console.log(`发现 ${slowQueries.length} 个慢查询:`);
slowQueries.forEach(query => {
  console.log(`- ${query.sql} (${query.duration}ms)`);
});
```

### 4. 生成性能报告

```typescript
// 生成完整的性能报告
const report = await db.getPerformanceReport();

console.log('性能报告:');
console.log(JSON.stringify(report, null, 2));
```

### 5. 重置统计

```typescript
// 重置性能统计
await db.resetStats();

console.log('✅ 统计已重置');
```

---

## 完整示例

下面是一个完整的示例，展示了如何使用 WebGeoDB 构建一个简单的餐厅搜索应用。

```typescript
import { WebGeoDB } from 'webgeodb-core';

async function main() {
  // 1. 创建数据库
  const db = new WebGeoDB('restaurant-finder');
  await db.open();
  console.log('✅ 数据库已打开');

  // 2. 创建表
  await db.createTable('restaurants', {
    id: 'number',
    name: 'string',
    type: 'string',
    geometry: 'geometry',
    properties: 'object'
  });
  console.log('✅ 表已创建');

  // 3. 插入测试数据
  const testData = [
    {
      id: 1,
      name: '北京烤鸭店',
      type: 'restaurant',
      geometry: { type: 'Point', coordinates: [116.4074, 39.9042] },
      properties: { rating: 4.5, price: 150, cuisine: '中餐' }
    },
    {
      id: 2,
      name: '川菜馆',
      type: 'restaurant',
      geometry: { type: 'Point', coordinates: [116.4100, 39.9050] },
      properties: { rating: 4.2, price: 80, cuisine: '川菜' }
    },
    {
      id: 3,
      name: '日料店',
      type: 'restaurant',
      geometry: { type: 'Point', coordinates: [116.4120, 39.9060] },
      properties: { rating: 4.8, price: 200, cuisine: '日料' }
    }
  ];

  await db.insertMany('restaurants', testData);
  console.log('✅ 测试数据已插入');

  // 4. 启用性能监控
  await db.enableProfiling(true);

  // 5. 执行查询
  console.log('\n--- 查询示例 ---\n');

  // 5.1 查询所有餐厅
  const allRestaurants = await db.table('restaurants').toArray();
  console.log(`所有餐厅: ${allRestaurants.length} 家`);

  // 5.2 查询高评分餐厅
  const highRated = await db.table('restaurants')
    .where('properties.rating', '>=', 4.5)
    .toArray();
  console.log(`高评分餐厅: ${highRated.length} 家`);

  // 5.3 空间查询 - 附近的餐厅
  const myLocation = [116.4074, 39.9042];
  const nearby = await db.table('restaurants')
    .distance('geometry', myLocation, '<', 1000)
    .toArray();
  console.log(`附近 1km 内: ${nearby.length} 家`);

  // 5.4 SQL 查询
  const sqlResults = await db.query(`
    SELECT * FROM restaurants
    WHERE properties.rating >= $1
    ORDER BY properties.rating DESC
  `, [4.5]);
  console.log(`SQL 查询结果: ${sqlResults.length} 家`);

  // 6. 查看性能统计
  console.log('\n--- 性能统计 ---\n');
  const stats = await db.getStats();
  console.log(`查询次数: ${stats.queryCount}`);
  console.log(`平均查询时间: ${stats.avgQueryTime.toFixed(2)}ms`);
  console.log(`索引命中率: ${(stats.indexHitRate * 100).toFixed(1)}%`);

  // 7. 关闭数据库
  await db.close();
  console.log('\n✅ 数据库已关闭');
}

// 运行
main().catch(console.error);
```

---

## 下一步

现在您已经掌握了 WebGeoDB 的基础用法，可以继续学习：

1. **[API 参考](../api/reference.md)** - 完整的 API 文档
2. **[空间引擎指南](../api/spatial-engine.md)** - 深入了解空间引擎
3. **[最佳实践](./best-practices.md)** - 生产环境配置和优化
4. **[性能优化](./performance.md)** - 索引选择和查询优化
5. **[故障排除](./troubleshooting.md)** - 常见问题和解决方案

---

## 获取帮助

- **文档**: https://github.com/webgeodb/webgeodb/tree/main/docs
- **Issues**: https://github.com/webgeodb/webgeodb/issues
- **Discussions**: https://github.com/webgeodb/webgeodb/discussions

---

**祝您使用愉快！** 🚀
