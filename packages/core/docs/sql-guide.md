# WebGeoDB SQL 查询功能

## 概述

WebGeoDB 现在支持 SQL 查询语法，提供与 PostgreSQL/PostGIS 高度兼容的查询接口。开发者可以使用熟悉的 SQL 语法进行空间和属性查询，同时保持与现有链式 API 的完全兼容性。

## 核心特性

- ✅ **PostgreSQL 兼容**: 支持标准 PostgreSQL SQL 语法
- ✅ **PostGIS 函数**: 支持常用的 PostGIS 空间函数
- ✅ **参数化查询**: 支持预编译语句，防止 SQL 注入
- ✅ **查询缓存**: LRU 缓存提升重复查询性能
- ✅ **查询计划**: 支持查询计划分析
- ✅ **轻量级**: 仅增加约 58KB 包体积

## 快速开始

### 基础查询

```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB({ name: 'mydb', version: 1 });
await db.open();

// 简单查询
const results = await db.query(`
  SELECT * FROM features
  WHERE type = 'poi'
`);

// 等价于：
// db.features.where('type', '=', 'poi').toArray();
```

### 参数化查询

```typescript
// 使用 ? 占位符
const pois = await db.query(`
  SELECT * FROM features
  WHERE type = ? AND rating >= ?
`, ['restaurant', 4.0]);
```

### 预编译语句

```typescript
// 创建预编译语句
const stmt = db.prepare(`
  SELECT * FROM features
  WHERE type = ? AND rating >= ?
`);

// 多次执行
const restaurants = await stmt.execute(['restaurant', 4.0]);
const hotels = await stmt.execute(['hotel', 3.0]);
```

## PostGIS 空间函数

### 空间关系谓词

```typescript
// ST_Intersects - 相交查询
const intersects = await db.query(`
  SELECT * FROM features
  WHERE ST_Intersects(geometry, ST_MakePoint(116.4, 39.9))
`);

// ST_Contains - 包含查询
const contains = await db.query(`
  SELECT * FROM zones
  WHERE ST_Contains(geometry, ST_MakePoint(116.4, 39.9))
`);

// ST_Within - 在内部查询
const within = await db.query(`
  SELECT * FROM features
  WHERE ST_Within(geometry, ST_Buffer(ST_MakePoint(116.4, 39.9), 1000))
`);
```

### 距离查询

```typescript
// ST_DWithin - 距离内查询
const nearby = await db.query(`
  SELECT * FROM features
  WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
`);

// 等价于：
// db.features.distance('geometry', [116.4, 39.9], '<=', 1000).toArray();
```

### 几何构造

```typescript
// ST_MakePoint - 创建点
const point = await db.query(`
  SELECT ST_MakePoint(116.4, 39.9) as geometry
`);

// ST_Buffer - 缓冲区
const buffered = await db.query(`
  SELECT * FROM zones
  WHERE ST_Intersects(geometry, ST_Buffer(ST_MakePoint(116.4, 39.9), 500))
`);
```

### 几何转换

```typescript
// ST_GeomFromText - WKT 转几何
const fromWKT = await db.query(`
  SELECT * FROM features
  WHERE ST_Intersects(geometry, ST_GeomFromText('POINT(116.4 39.9)'))
`);

// ST_AsText - 几何转 WKT
const toWKT = await db.query(`
  SELECT ST_AsText(geometry) as wkt
  FROM features
  LIMIT 1
`);
```

## 高级功能

### 查询计划分析

```typescript
const plan = db.explain(`
  SELECT * FROM features WHERE type = ?
`);

console.log('查询计划:', plan);
// {
//   table: 'features',
//   columns: ['*'],
//   where: {...},
//   spatialConditions: [],
//   orderBy: [],
//   limit: undefined,
//   offset: undefined
// }
```

### 缓存管理

```typescript
// 获取缓存统计
const stats = db.getQueryCacheStats();
console.log('缓存大小:', stats.size);
console.log('最大容量:', stats.maxSize);
console.log('总访问次数:', stats.totalAccessCount);

// 使表缓存失效
db.invalidateQueryCache('features');

// 使所有缓存失效
db.invalidateQueryCache();
```

### ORDER BY 和 LIMIT

```typescript
const sorted = await db.query(`
  SELECT name, rating
  FROM features
  ORDER BY rating DESC
  LIMIT 10
`);

// 等价于：
// db.features.orderBy('rating', 'desc').limit(10).toArray();
```

## 支持的 SQL 语法

### SELECT 语句

```sql
SELECT * FROM table_name
SELECT col1, col2 FROM table_name
SELECT DISTINCT col FROM table_name
SELECT * FROM table_name WHERE condition
SELECT * FROM table_name ORDER BY col ASC/DESC
SELECT * FROM table_name LIMIT n
SELECT * FROM table_name LIMIT n OFFSET m
SELECT * FROM table_name GROUP BY col
```

### WHERE 条件

```sql
-- 比较操作符
field = value
field != value
field > value
field >= value
field < value
field <= value

-- 逻辑操作符
condition1 AND condition2
condition1 OR condition2
NOT condition

-- IN 操作符
field IN (value1, value2)
field NOT IN (value1, value2)

-- LIKE 操作符
field LIKE 'pattern'
field NOT LIKE 'pattern'
```

### PostGIS 函数

| 函数 | 说明 | 示例 |
|------|------|------|
| ST_Intersects | 相交判断 | `ST_Intersects(geom1, geom2)` |
| ST_Contains | 包含判断 | `ST_Contains(geom1, geom2)` |
| ST_Within | 在内部判断 | `ST_Within(geom1, geom2)` |
| ST_Equals | 相等判断 | `ST_Equals(geom1, geom2)` |
| ST_Disjoint | 分离判断 | `ST_Disjoint(geom1, geom2)` |
| ST_Touches | 接触判断 | `ST_Touches(geom1, geom2)` |
| ST_Crosses | 交叉判断 | `ST_Crosses(geom1, geom2)` |
| ST_Overlaps | 重叠判断 | `ST_Overlaps(geom1, geom2)` |
| ST_DWithin | 距离内判断 | `ST_DWithin(geom, point, distance)` |
| ST_Distance | 距离计算 | `ST_Distance(geom1, geom2)` |
| ST_MakePoint | 创建点 | `ST_MakePoint(x, y)` |
| ST_MakeLine | 创建线 | `ST_MakeLine(point1, point2)` |
| ST_Buffer | 缓冲区 | `ST_Buffer(geom, radius, units)` |
| ST_Centroid | 质心计算 | `ST_Centroid(geom)` |
| ST_GeomFromText | WKT 转几何 | `ST_GeomFromText('POINT(x y)')` |
| ST_AsText | 几何转 WKT | `ST_AsText(geom)` |
| ST_Area | 面积计算 | `ST_Area(geom)` |
| ST_Length | 长度计算 | `ST_Length(geom)` |

## 性能优化

### 查询缓存

SQL 查询结果会自动缓存，重复查询时会直接返回缓存结果：

```typescript
// 第一次查询：执行完整查询
const result1 = await db.query('SELECT * FROM features WHERE type = ?', ['poi']);

// 第二次查询：直接返回缓存（极快）
const result2 = await db.query('SELECT * FROM features WHERE type = ?', ['poi']);
```

### 预编译语句

对于需要多次执行的查询，使用预编译语句可以避免重复解析 SQL：

```typescript
const stmt = db.prepare('SELECT * FROM features WHERE type = ?');

// 多次执行（SQL 只解析一次）
const pois1 = await stmt.execute(['poi']);
const pois2 = await stmt.execute(['restaurant']);
```

### 与链式 API 的性能对比

SQL 查询与链式 API 使用相同的底层执行引擎，性能相当：

```typescript
// SQL 方式
const sqlResults = await db.query(`
  SELECT * FROM features
  WHERE type = 'poi'
  LIMIT 10
`);

// 链式 API 方式（性能相同）
const apiResults = await db.features
  .where('type', '=', 'poi')
  .limit(10)
  .toArray();
```

## 限制和注意事项

### 不支持的 SQL 功能

以下功能当前版本不支持（可能在后续版本添加）：

- ❌ JOIN 操作
- ❌ 子查询
- ❌ UNION/INTERSECT/EXCEPT
- ❌ 聚合函数（COUNT、SUM、AVG 等）
- ❌ HAVING 子句
- ❌ 窗口函数
- ❌ CTE（WITH 子句）
- ❌ INSERT/UPDATE/DELETE 语句（部分支持）

### SQL 与链式 API 的选择

| 场景 | 推荐方式 | 原因 |
|------|---------|------|
| 简单查询 | 链式 API | 更简洁，类型安全 |
| 复杂条件 | SQL | 更直观，更易维护 |
| 空间查询 | 两者皆可 | SQL 更接近 PostGIS 语法 |
| 动态查询 | 链式 API | 更灵活，易于构建 |
| 熟悉 SQL | SQL | 降低学习成本 |

## 技术实现

### 依赖库

- **node-sql-parser**: SQL 解析器（~50KB）
- **wellknown**: WKT/WKB 转换（~3KB）
- **自定义代码**: 转换器、执行器、缓存（~47KB）

### 架构

```
SQL 语句
  ↓
node-sql-parser (解析)
  ↓
AST (抽象语法树)
  ↓
SQLToQueryBuilderTranslator (转换)
  ↓
QueryBuilder (执行)
  ↓
IndexedDB + 空间索引
```

### 包体积影响

| 模块 | 大小 |
|------|------|
| 原核心包 | 84KB |
| SQL 解析器 | +50KB |
| 辅助库 | +3KB |
| 自定义代码 | +5KB |
| **总计** | **142KB** |

仍在承诺的 < 300KB 范围内。

## 示例

完整示例请参考 `examples/sql-example.ts`。

## 未来计划

- [ ] 支持 JOIN 操作
- [ ] 支持聚合函数
- [ ] 支持 INSERT/UPDATE/DELETE 语句
- [ ] 支持视图（VIEW）
- [ ] 支持事务
- [ ] 更完整的 PostGIS 函数支持

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
