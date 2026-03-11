# SQL API 迁移指南

本指南帮助您从链式 API 迁移到 SQL API。

## 为什么使用 SQL API？

### 优势

- ✅ **PostgreSQL/PostGIS 兼容** - 复用现有 SQL 知识
- ✅ **更简洁** - 复杂查询更易读易写
- ✅ **标准化** - 行业标准，学习成本低
- ✅ **功能完整** - 支持参数化查询和预编译语句

### 对比

| 场景 | 链式 API | SQL API |
|------|----------|---------|
| 简单查询 | ✅ 更简洁 | 稍长 |
| 复杂条件 | ⚠️ 代码冗长 | ✅ 更清晰 |
| 空间查询 | ⚠️ 需要学习特定方法 | ✅ PostGIS 兼容 |
| 动态查询 | ✅ 构建灵活 | ⚠️ 需要字符串拼接 |
| 团队协作 | ⚠️ 需要学习特定 API | ✅ SQL 是通用技能 |

## 快速迁移示例

### 基础查询

```typescript
// 链式 API
const results = await db.features
  .where('type', '=', 'poi')
  .toArray();

// SQL API
const results = await db.query(`
  SELECT * FROM features WHERE type = 'poi'
`);
```

### 复杂条件

```typescript
// 链式 API
const results = await db.features
  .where('type', '=', 'poi')
  .where('rating', '>=', 4)
  .orderBy('rating', 'desc')
  .limit(10)
  .toArray();

// SQL API
const results = await db.query(`
  SELECT * FROM features
  WHERE type = 'poi' AND rating >= 4
  ORDER BY rating DESC
  LIMIT 10
`);
```

### 空间查询

```typescript
// 链式 API
const results = await db.features
  .distance('geometry', [116.4, 39.9], '<=', 1000)
  .toArray();

// SQL API（使用 PostGIS）
const results = await db.query(`
  SELECT * FROM features
  WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
`);
```

### 参数化查询

```typescript
// 链式 API（需要手动拼接）
const type = 'poi';
const minRating = 4;
const results = await db.features
  .where('type', '=', type)
  .where('rating', '>=', minRating)
  .toArray();

// SQL API（更安全，防止 SQL 注入）
const results = await db.query(`
  SELECT * FROM features
  WHERE type = $1 AND rating >= $2
`, [type, minRating]);
```

### 预编译语句（新增功能）

```typescript
// 链式 API（每次都要构建查询）
const query1 = db.features.where('type', '=', 'poi');
const query2 = db.features.where('type', '=', 'restaurant');
const results1 = await query1.toArray();
const results2 = await query2.toArray();

// SQL API（预编译，性能更好）
const stmt = db.prepare('SELECT * FROM features WHERE type = $1');
const results1 = await stmt.execute(['poi']);
const results2 = await stmt.execute(['restaurant']);
```

## API 映射表

### 条件查询

| 链式 API | SQL API |
|----------|---------|
| `where(field, '=', value)` | `WHERE field = value` |
| `where(field, '>', value)` | `WHERE field > value` |
| `where(field, '>=', value)` | `WHERE field >= value` |
| `where(field, '<', value)` | `WHERE field < value` |
| `where(field, '<=', value)` | `WHERE field <= value` |
| `where(field, '!=', value)` | `WHERE field != value` |
| `where(field, 'in', values)` | `WHERE field IN (values)` |

### 空间查询

| 链式 API | SQL API |
|----------|---------|
| `intersects(field, geom)` | `WHERE ST_Intersects(field, geom)` |
| `contains(field, geom)` | `WHERE ST_Contains(field, geom)` |
| `within(field, geom)` | `WHERE ST_Within(field, geom)` |
| `distance(field, point, '<=', dist)` | `WHERE ST_DWithin(field, point, dist)` |

### 排序和分页

| 链式 API | SQL API |
|----------|---------|
| `orderBy(field, 'desc')` | `ORDER BY field DESC` |
| `orderBy(field, 'asc')` | `ORDER BY field ASC` |
| `limit(n)` | `LIMIT n` |
| `offset(n)` | `OFFSET n` |

## 完整示例对比

### 示例 1：查找附近的餐厅

```typescript
// 链式 API
const nearby = await db.features
  .where('type', '=', 'restaurant')
  .distance('geometry', [116.4, 39.9], '<=', 500)
  .orderBy('rating', 'desc')
  .limit(5)
  .toArray();

// SQL API
const nearby = await db.query(`
  SELECT * FROM features
  WHERE type = 'restaurant'
    AND ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 500)
  ORDER BY rating DESC
  LIMIT 5
`);
```

### 示例 2：查找在多边形内的点

```typescript
// 链式 API
const polygon = {
  type: 'Polygon',
  coordinates: [[
    [116.4, 39.9],
    [116.5, 39.9],
    [116.5, 40.0],
    [116.4, 40.0],
    [116.4, 39.9]
  ]]
};

const results = await db.features
  .within('geometry', polygon)
  .toArray();

// SQL API
const wkt = 'POLYGON((116.4 39.9, 116.5 39.9, 116.5 40.0, 116.4 40.0, 116.4 39.9))';
const results = await db.query(`
  SELECT * FROM features
  WHERE ST_Within(geometry, ST_GeomFromText('$1'))
`, [wkt]);
```

### 示例 3：动态查询

```typescript
// 链式 API（适合动态构建）
function searchFeatures(filters: any) {
  let query = db.features;

  if (filters.type) {
    query = query.where('type', '=', filters.type);
  }

  if (filters.minRating) {
    query = query.where('rating', '>=', filters.minRating);
  }

  if (filters.maxDistance && filters.center) {
    query = query.distance('geometry', filters.center, '<=', filters.maxDistance);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  return query.toArray();
}

// SQL API（需要动态拼接）
function searchFeaturesSQL(filters: any) {
  const conditions = [];
  const params: any[] = [];

  if (filters.type) {
    conditions.push('type = $1');
    params.push(filters.type);
  }

  if (filters.minRating) {
    conditions.push('rating >= $' + (params.length + 1));
    params.push(filters.minRating);
  }

  if (filters.maxDistance && filters.center) {
    conditions.push(`ST_DWithin(geometry, ST_MakePoint(${filters.center.join(', ')}), $${params.length + 1})`);
    params.push(filters.maxDistance);
  }

  const whereClause = conditions.join(' AND ');
  const limitClause = filters.limit ? `LIMIT ${filters.limit}` : '';

  return db.query(`
    SELECT * FROM features
    WHERE ${whereClause}
    ${limitClause}
  `);
}

// 推荐：对于复杂动态查询，仍然使用链式 API
// 对于简单动态查询，SQL API 也很好用
```

## 性能考虑

### 查询性能

两种 API 使用相同的底层执行引擎，性能相当：

```typescript
// 链式 API
const t1 = performance.now();
const results1 = await db.features
  .where('type', '=', 'poi')
  .limit(10)
  .toArray();
const t2 = performance.now();
console.log(`链式 API: ${t2 - t1}ms`);

// SQL API
const t3 = performance.now();
const results2 = await db.query(`
  SELECT * FROM features WHERE type = 'poi' LIMIT 10
`);
const t4 = performance.now();
console.log(`SQL API: ${t4 - t3}ms`);
```

### 缓存优化

SQL API 有内置缓存，重复查询更快：

```typescript
// 第一次查询：解析 + 执行
const results1 = await db.query('SELECT * FROM features WHERE type = $1', ['poi']);

// 第二次查询：直接返回缓存（极快）
const results2 = await db.query('SELECT * FROM features WHERE type = $1', ['poi']);
```

### 预编译语句

对于需要多次执行的查询，使用预编译语句：

```typescript
// 创建预编译语句（只解析一次）
const stmt = db.prepare('SELECT * FROM features WHERE rating >= $1');

// 多次执行（不需要重复解析）
for (const rating of [4, 5, 6]) {
  const results = await stmt.execute([rating]);
  // 处理结果...
}
```

## 建议使用场景

### 使用链式 API 的场景

- ✅ 动态构建复杂查询
- ✅ 需要类型安全的查询构建
- ✅ 简单的 CRUD 操作
- ✅ 不熟悉 SQL 的开发者

### 使用 SQL API 的场景

- ✅ 复杂的多条件查询
- ✅ 熟悉 PostgreSQL/PostGIS 的开发者
- ✅ 需要参数化查询
- ✅ 需要预编译语句
- ✅ 从其他数据库迁移代码

## 混合使用

两种 API 可以自由混合使用，选择最适合当前场景的即可：

```typescript
// 使用链式 API 构建基础查询
let query = db.features.where('type', '=', 'poi');

// 如果需要额外的空间条件，可以切换到 SQL
// 但推荐继续使用链式 API
query = query.intersects('geometry', somePolygon);

// 执行查询
const results = await query.toArray();
```

## 总结

- SQL API 和链式 API 使用相同的底层引擎，性能相当
- SQL API 更适合复杂查询和熟悉 SQL 的开发者
- 链式 API 更适合动态查询和类型安全的构建
- 两种 API 可以混合使用，选择最适合当前场景的即可
- SQL API 提供了额外的功能：预编译语句、查询缓存、查询计划分析
