# @webgeodb/core

> 轻量级 Web 端空间数据库核心引擎

[![npm version](https://badge.fury.io/js/%40webgeodb%2Fcore.svg)](https://www.npmjs.com/package/@webgeodb/core)
[![bundle size](https://img.shields.io/bundleph/142kb/min)](https://bundlephobia.com/result?p=@webgeodb/core)
[![tests](https://img.shields.io/badge/tests-26%2F17%20passing-brightgreen)](./test/sql)

## 特性

- 🪶 **轻量级**: 核心包仅 142KB，比 SQLite WASM 小 70%
- ⚡ **高性能**: 查询响应时间 < 1s，支持 100MB-1GB 数据集
- 🔌 **可扩展**: 插件化架构，按需加载功能模块
- 📱 **离线优先**: 完整的 IndexedDB 存储，适合离线应用
- 🛠️ **易用性**: SQL 查询 + 链式 API，学习成本低
- 🆕 **SQL 支持**: PostgreSQL/PostGIS 兼容的查询接口
- 🌐 **跨平台**: 支持现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+)

## 快速开始

### 安装

```bash
# 使用 pnpm
pnpm add @webgeodb/core

# 使用 npm
npm install @webgeodb/core

# 使用 yarn
yarn add @webgeodb/core
```

### 基础用法

```typescript
import { WebGeoDB } from '@webgeodb/core';

// 创建数据库实例
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
    rating: 'number',
    geometry: 'geometry'
  }
});

// 打开数据库
await db.open();

// 插入数据
await db.features.insert({
  id: '1',
  name: 'Point A',
  type: 'poi',
  rating: 5,
  geometry: {
    type: 'Point',
    coordinates: [116.397128, 39.916527]
  }
});

// 链式 API 查询
const results = await db.features
  .where('type', '=', 'poi')
  .distance('geometry', [116.4, 39.9], '<', 1000)
  .orderBy('rating', 'desc')
  .limit(10)
  .toArray();
```

## SQL 查询支持 🆕

### 基础查询

```typescript
// 简单查询
const results = await db.query(`
  SELECT * FROM features WHERE type = 'poi'
`);

// 参数化查询
const pois = await db.query(`
  SELECT * FROM features
  WHERE type = $1 AND rating >= $2
`, ['restaurant', 4.0]);

// ORDER BY 和 LIMIT
const sorted = await db.query(`
  SELECT name, rating
  FROM features
  ORDER BY rating DESC
  LIMIT 10
`);
```

### 空间查询

```typescript
// 使用 PostGIS 函数
const nearby = await db.query(`
  SELECT * FROM features
  WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
`);

// 空间关系查询
const intersects = await db.query(`
  SELECT * FROM zones
  WHERE ST_Intersects(geometry, ST_Buffer(ST_MakePoint(116.4, 39.9), 500))
`);
```

### 预编译语句

```typescript
const stmt = db.prepare(`
  SELECT * FROM features WHERE rating >= $1
`);

// 多次执行
const highlyRated = await stmt.execute([4.0]);
const topRated = await stmt.execute([5.0]);
```

### 查询计划分析

```typescript
const plan = db.explain('SELECT * FROM features WHERE type = $1');
console.log('查询计划:', plan);
// {
//   table: 'features',
//   columns: ['*'],
//   spatialConditions: [],
//   estimatedCost: ...
// }
```

## API 参考

### WebGeoDB 类

| 方法 | 说明 |
|------|------|
| `schema(schemas)` | 定义表结构 |
| `open()` | 打开数据库 |
| `close()` | 关闭数据库 |
| `query(sql, options)` | 执行 SQL 查询 🆕 |
| `prepare(sql)` | 创建预编译语句 🆕 |
| `explain(sql)` | 分析查询计划 🆕 |
| `invalidateQueryCache(table)` | 使查询缓存失效 🆕 |
| `getQueryCacheStats()` | 获取缓存统计 🆕 |

### 链式查询 API

| 方法 | 说明 |
|------|------|
| `where(field, operator, value)` | 添加查询条件 |
| `intersects(field, geometry)` | 相交查询 |
| `contains(field, geometry)` | 包含查询 |
| `within(field, geometry)` | 在内部查询 |
| `distance(field, point, operator, dist)` | 距离查询 |
| `orderBy(field, direction)` | 排序 |
| `limit(n)` | 限制数量 |
| `offset(n)` | 偏移 |
| `toArray()` | 执行查询并返回结果 |

## 支持的 PostGIS 函数

### 空间关系谓词

- `ST_Intersects(geom1, geom2)` - 相交判断
- `ST_Contains(geom1, geom2)` - 包含判断
- `ST_Within(geom1, geom2)` - 在内部判断
- `ST_Equals(geom1, geom2)` - 相等判断
- `ST_Disjoint(geom1, geom2)` - 分离判断
- `ST_Touches(geom1, geom2)` - 接触判断
- `ST_Crosses(geom1, geom2)` - 交叉判断
- `ST_Overlaps(geom1, geom2)` - 重叠判断

### 距离函数

- `ST_DWithin(geom, point, distance)` - 距离内判断
- `ST_Distance(geom1, geom2)` - 距离计算

### 几何构造

- `ST_MakePoint(x, y)` - 创建点
- `ST_MakeLine(point1, point2)` - 创建线
- `ST_Buffer(geom, radius, units)` - 缓冲区
- `ST_Centroid(geom)` - 质心计算

### 几何转换

- `ST_GeomFromText(wkt)` - WKT 转几何
- `ST_AsText(geom)` - 几何转 WKT
- `ST_AsBinary(geom)` - 几何转 WKB

## 性能特性

- **查询缓存**: LRU 缓存自动缓存重复查询
- **预编译语句**: 避免重复解析 SQL
- **空间索引**: R-tree 索引加速空间查询
- **多条件优化**: 自动优化复合查询条件

## 包体积

| 组件 | 大小 |
|------|------|
| 核心引擎 | 84KB |
| SQL 解析器 | +50KB |
| WKT 转换 | +3KB |
| 自定义代码 | +5KB |
| **总计** | **142KB** |

## 许可证

MIT

## 相关包

- `@webgeodb/core` - 核心引擎
- `@webgeodb/react` - React Hooks (计划中)
- `@webgeodb/vue` - Vue Composables (计划中)
