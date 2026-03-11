# SQL API vs 链式 API 详细对比

本文档详细对比 WebGeoDB 的两种查询 API，帮助你选择最合适的查询方式。

## 目录

- [快速对比](#快速对比)
- [详细功能对比](#详细功能对比)
- [性能对比](#性能对比)
- [代码可读性对比](#代码可读性对比)
- [学习曲线](#学习曲线)
- [使用场景建议](#使用场景建议)
- [迁移示例](#迁移示例)

---

## 快速对比

| 特性 | 链式 API | SQL API |
|------|----------|---------|
| **语法风格** | JavaScript 方法调用 | SQL 查询语句 |
| **类型安全** | ✅ 完整 TypeScript 支持 | ⚠️ 运行时检查 |
| **动态查询** | ✅ 灵活构建 | ⚠️ 需要字符串拼接 |
| **复杂条件** | ⚠️ 代码冗长 | ✅ 更清晰 |
| **空间查询** | ⚠️ 需学习特定方法 | ✅ PostGIS 兼容 |
| **性能** | ✅ 原生执行，无解析开销 | ⚠️ 需要解析，但有缓存 |
| **查询缓存** | ❌ 无 | ✅ 自动 LRU 缓存 |
| **预编译语句** | ❌ 无 | ✅ 支持 |
| **团队协作** | ⚠️ 需学习特定 API | ✅ SQL 是通用技能 |
| **代码可读性** | 简单查询更好 | 复杂查询更好 |

---

## 详细功能对比

### 1. 简单查询

**链式 API** - ✅ 更简洁
```typescript
const results = await db.features
  .where('type', '=', 'poi')
  .toArray();
```

**SQL API** - 稍长
```typescript
const results = await db.query(`
  SELECT * FROM features WHERE type = 'poi'
`);
```

**结论：** 简单查询使用链式 API 更简洁。

---

### 2. 复杂条件查询

**链式 API** - ⚠️ 代码冗长
```typescript
const results = await db.features
  .where('type', '=', 'restaurant')
  .where('properties.rating', '>=', 4)
  .where('properties.price', '<=', 100)
  .where('location.city', '=', 'Beijing')
  .orderBy('properties.rating', 'desc')
  .limit(10)
  .toArray();
```

**SQL API** - ✅ 更清晰
```typescript
const results = await db.query(`
  SELECT *
  FROM features
  WHERE type = 'restaurant'
    AND properties.rating >= 4
    AND properties.price <= 100
    AND location.city = 'Beijing'
  ORDER BY properties.rating DESC
  LIMIT 10
`);
```

**结论：** 复杂查询 SQL 更易读。

---

### 3. 空间查询

**链式 API** - ⚠️ 需要学习特定方法
```typescript
const nearby = await db.features
  .distance('geometry', [116.4, 39.9], '<=', 1000)
  .intersects('geometry', bufferZone)
  .orderBy('properties.rating', 'desc')
  .limit(5)
  .toArray();
```

**SQL API** - ✅ PostGIS 兼容，更标准
```typescript
const nearby = await db.query(`
  SELECT *
  FROM features
  WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
    AND ST_Intersects(geometry, ST_Buffer(ST_MakePoint(116.4, 39.9), 500))
  ORDER BY properties.rating DESC
  LIMIT 5
`);
```

**结论：** 空间查询 SQL 更标准，PostGIS 用户无学习成本。

---

### 4. 动态查询

**链式 API** - ✅ 灵活构建
```typescript
function searchFeatures(filters: any) {
  let query = db.features;

  if (filters.type) {
    query = query.where('type', '=', filters.type);
  }

  if (filters.minRating) {
    query = query.where('properties.rating', '>=', filters.minRating);
  }

  if (filters.maxPrice) {
    query = query.where('properties.price', '<=', filters.maxPrice);
  }

  if (filters.nearby && filters.center) {
    query = query.distance('geometry', filters.center, '<=', filters.nearby);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  return query.toArray();
}
```

**SQL API** - ⚠️ 需要字符串拼接
```typescript
function searchFeaturesSQL(filters: any) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.type) {
    conditions.push('type = $1');
    params.push(filters.type);
  }

  if (filters.minRating) {
    conditions.push(`properties.rating >= $${params.length + 1}`);
    params.push(filters.minRating);
  }

  if (filters.maxPrice) {
    conditions.push(`properties.price <= $${params.length + 1}`);
    params.push(filters.maxPrice);
  }

  if (filters.nearby && filters.center) {
    conditions.push(
      `ST_DWithin(geometry, ST_MakePoint(${filters.center.join(', ')}), $${params.length + 1})`
    );
    params.push(filters.nearby);
  }

  const whereClause = conditions.join(' AND ');
  const limitClause = filters.limit ? `LIMIT ${filters.limit}` : '';

  return db.query(`
    SELECT * FROM features
    WHERE ${whereClause}
    ${limitClause}
  `, { params });
}
```

**结论：** 动态查询链式 API 更灵活安全。

---

### 5. 参数化查询

**链式 API** - ⚠️ 需要手动处理
```typescript
const type = userInput; // 可能包含恶意内容
const results = await db.features
  .where('type', '=', type) // 自动转义
  .toArray();
```

**SQL API** - ✅ 原生支持，更安全
```typescript
const type = userInput; // 可能包含恶意内容
const results = await db.query(`
  SELECT * FROM features WHERE type = $1
`, { params: [type] }); // 自动转义，防注入
```

**结论：** 两者都安全，但 SQL 的参数化是标准做法。

---

### 6. 重复查询

**链式 API** - ❌ 每次构建查询
```typescript
// 需要多次执行相同结构的查询
for (const type of ['restaurant', 'cafe', 'bar']) {
  const results = await db.features
    .where('type', '=', type)
    .where('rating', '>=', 4)
    .toArray();
}
```

**SQL API** - ✅ 预编译语句
```typescript
// 创建预编译语句（只解析一次）
const stmt = db.prepare(`
  SELECT * FROM features WHERE type = $1 AND rating >= $2
`);

// 多次执行（高效）
for (const type of ['restaurant', 'cafe', 'bar']) {
  const results = await stmt.execute([type, 4]);
}
```

**结论：** 重复查询 SQL 预编译性能更好。

---

## 性能对比

### 查询执行时间

| 操作 | 链式 API | SQL API (首次) | SQL API (缓存) |
|------|----------|---------------|---------------|
| 简单查询 | ~10ms | ~60ms | ~10ms |
| 复杂查询 | ~50ms | ~100ms | ~50ms |
| 空间查询 | ~100ms | ~150ms | ~100ms |

### 解析开销

- **链式 API**：无解析开销，直接执行
- **SQL API**：
  - 首次查询：~50ms 解析开销
  - 缓存命中：< 1ms
  - 预编译语句：无解析开销

### 缓存效果

```typescript
// 测试缓存效果
async function testCache() {
  const sql = 'SELECT * FROM features WHERE type = $1';

  // 第一次：解析 + 执行
  const t1 = performance.now();
  await db.query(sql, { params: ['poi'] });
  console.log(`首次: ${performance.now() - t1}ms`);

  // 第二次：缓存命中
  const t2 = performance.now();
  await db.query(sql, { params: ['restaurant'] });
  console.log(`缓存: ${performance.now() - t2}ms`);
}

// 结果示例：
// 首次: 65ms
// 缓存: 12ms (提速 5x)
```

### 内存占用

- **链式 API**：无额外内存
- **SQL API**：
  - LRU 缓存：默认 100 条
  - 每条约 1-5KB
  - 总计：100-500KB

---

## 代码可读性对比

### 场景 1：团队协作

**链式 API**
```typescript
// 需要学习 WebGeoDB 特定 API
const results = await db.features
  .intersects('geometry', searchArea)
  .distance('geometry', center, '<=', radius)
  .toArray();
```

**SQL API**
```typescript
// 任何会 SQL 的人都能看懂
const results = await db.query(`
  SELECT * FROM features
  WHERE ST_Intersects(geometry, ST_GeomFromText($1))
    AND ST_DWithin(geometry, ST_MakePoint($2, $3), $4)
`, { params: [wkt, center[0], center[1], radius] });
```

**结论：** SQL 更适合团队协作和代码审查。

---

### 场景 2：复杂业务逻辑

**链式 API**
```typescript
const results = await db.features
  .where('type', '=', 'restaurant')
  .where('properties.open', '=', true)
  .where('properties.delivery', '=', true)
  .distance('geometry', userLocation, '<=', deliveryRadius)
  .orderBy('properties.rating', 'desc')
  .orderBy('properties.deliveryTime', 'asc')
  .limit(10)
  .toArray();
```

**SQL API**
```typescript
const results = await db.query(`
  SELECT *
  FROM features
  WHERE type = 'restaurant'
    AND properties.open = true
    AND properties.delivery = true
    AND ST_DWithin(geometry, ST_MakePoint($1, $2), $3)
  ORDER BY
    properties.rating DESC,
    properties.deliveryTime ASC
  LIMIT 10
`, { params: [userLocation[0], userLocation[1], deliveryRadius] });
```

**结论：** SQL 通过格式化更清晰地展示业务逻辑。

---

## 学习曲线

### 链式 API

**适合：**
- JavaScript/TypeScript 开发者
- 不熟悉 SQL 的开发者
- 需要类型安全的场景

**学习时间：** 1-2 小时

**学习资源：**
- WebGeoDB 文档
- TypeScript 类型提示
- IDE 自动补全

### SQL API

**适合：**
- 熟悉 SQL 的开发者
- 有 PostgreSQL/PostGIS 经验
- 需要迁移传统数据库应用

**学习时间：** 0-1 小时（如果已熟悉 SQL）

**学习资源：**
- [packages/core/docs/sql-guide.md](../packages/core/docs/sql-guide.md)
- PostgreSQL 文档
- PostGIS 文档

---

## 使用场景建议

### 使用链式 API 的场景

✅ **推荐使用：**

1. **简单 CRUD 操作**
   ```typescript
   await db.features.where('id', '=', id).toArray();
   ```

2. **动态查询构建**
   ```typescript
   function buildQuery(filters) {
     let query = db.features;
     if (filters.type) query = query.where('type', '=', filters.type);
     return query;
   }
   ```

3. **需要完整类型安全**
   ```typescript
   interface Feature {
     id: string;
     name: string;
     type: string;
   }
   const results: Feature[] = await db.features.toArray();
   ```

4. **不熟悉 SQL 的开发者**

---

### 使用 SQL API 的场景

✅ **推荐使用：**

1. **复杂多条件查询**
   ```typescript
   await db.query(`
     SELECT * FROM features
     WHERE type = 'restaurant'
       AND rating >= 4
       AND ST_DWithin(...)
   `);
   ```

2. **熟悉 SQL 的团队**
   - 降低学习成本
   - 提高代码可读性

3. **需要查询缓存**
   ```typescript
   // 自动缓存重复查询
   const results = await db.query(`SELECT * FROM features WHERE type = $1`, { params: ['poi'] });
   ```

4. **重复执行相同查询**
   ```typescript
   const stmt = db.prepare(`SELECT * FROM features WHERE type = $1`);
   for (const type of types) {
     await stmt.execute([type]);
   }
   ```

5. **从 PostgreSQL/PostGIS 迁移**
   - 复用现有 SQL 代码
   - 减少迁移成本

---

### 混合使用

两种 API 可以自由混合，选择最适合当前场景的：

```typescript
// 使用链式 API 构建基础查询
let query = db.features.where('type', '=', 'poi');

// 如果需要额外的空间条件，切换到 SQL
// 或者继续使用链式 API
query = query.intersects('geometry', searchArea);

// 执行查询
const results = await query.toArray();
```

---

## 迁移示例

### 示例 1：简单查询

**链式 API → SQL**
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

---

### 示例 2：复杂查询

**链式 API → SQL**
```typescript
// 链式 API
const results = await db.features
  .where('type', '=', 'restaurant')
  .where('properties.rating', '>=', 4)
  .distance('geometry', [116.4, 39.9], '<=', 1000)
  .orderBy('properties.rating', 'desc')
  .limit(10)
  .toArray();

// SQL API
const results = await db.query(`
  SELECT *
  FROM features
  WHERE type = 'restaurant'
    AND properties.rating >= 4
    AND ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
  ORDER BY properties.rating DESC
  LIMIT 10
`);
```

---

### 示例 3：参数化查询

**链式 API → SQL**
```typescript
// 链式 API
function searchByType(type: string) {
  return db.features
    .where('type', '=', type)
    .toArray();
}

// SQL API
function searchByTypeSQL(type: string) {
  return db.query(`
    SELECT * FROM features WHERE type = $1
  `, { params: [type] });
}
```

---

### 示例 4：重复查询

**链式 API → SQL**
```typescript
// 链式 API（每次都构建查询）
async function getTopRated(type: string, limit: number) {
  return await db.features
    .where('type', '=', type)
    .where('rating', '>=', 4)
    .orderBy('rating', 'desc')
    .limit(limit)
    .toArray();
}

// SQL API（使用预编译语句）
const getTopRatedStmt = db.prepare(`
  SELECT * FROM features
  WHERE type = $1 AND rating >= 4
  ORDER BY rating DESC
  LIMIT $2
`);

async function getTopRatedSQL(type: string, limit: number) {
  return await getTopRatedStmt.execute([type, limit]);
}
```

---

## 总结

### 选择建议

**使用链式 API，如果：**
- ✅ 查询简单（1-2 个条件）
- ✅ 需要动态构建查询
- ✅ 需要完整类型安全
- ✅ 不熟悉 SQL

**使用 SQL API，如果：**
- ✅ 查询复杂（3+ 个条件）
- ✅ 熟悉 SQL/PostgreSQL
- ✅ 需要查询缓存
- ✅ 需要预编译语句
- ✅ 团队协作需要更好的可读性

### 性能建议

1. **简单查询**：链式 API 略快（无解析开销）
2. **复杂查询**：SQL API 更易维护，性能差异可忽略
3. **重复查询**：SQL 预编译语句最快
4. **缓存场景**：SQL API 有明显优势

### 最佳实践

```typescript
// 混合使用示例
class FeatureRepository {
  // 简单查询用链式 API
  async findById(id: string) {
    return await db.features.where('id', '=', id).first();
  }

  // 复杂查询用 SQL
  async searchNearby(center: [number, number], radius: number) {
    return await db.query(`
      SELECT * FROM features
      WHERE ST_DWithin(geometry, ST_MakePoint($1, $2), $3)
    `, { params: [center[0], center[1], radius] });
  }

  // 重复查询用预编译语句
  private findByTypeStmt = db.prepare(`
    SELECT * FROM features WHERE type = $1 ORDER BY rating DESC
  `);

  async getTopByType(type: string) {
    return await this.findByTypeStmt.execute([type]);
  }
}
```

---

## 参考资源

- [SQL 使用指南](../packages/core/docs/sql-guide.md)
- [迁移指南](../packages/core/docs/sql-migration-guide.md)
- [API 参考](./api/reference.md)
- [SQL 最佳实践](./guides/sql-best-practices.md)
