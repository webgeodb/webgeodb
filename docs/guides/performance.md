# WebGeoDB 性能优化指南

> 📅 更新时间: 2026-03-21

## 核心原则

WebGeoDB 的性能优势来自**避免 IndexedDB IO**：空间查询直接从内存 R-tree 返回结果，而非每次查询都读取磁盘。

---

## 目录

1. [性能基准](#性能基准)
2. [必须掌握的最佳实践](#必须掌握的最佳实践)
3. [场景对比](#场景对比)
4. [内存使用](#内存使用)
5. [性能监控](#性能监控)

---

## 性能基准

### 测试结果（Chrome，100K GeoJSON Point，200m 查询半径）

| 查询方式 | 时间 | 原理 |
|---------|-----|------|
| Dexie + Turf.js（全表扫描） | ~287ms | toArray() + 逐条 turf.distance() |
| WebGeoDB 链式 API | ~5ms | R-tree bbox 过滤 + IndexItem.data 直接返回 |
| WebGeoDB SQL 查询 | ~5ms | 同链式 API，Plan B 已接入空间索引 |

**加速比：约 60x（100K 数据，精确空间查询）**

### 为什么这么快？

```
传统方案（Dexie + Turf）：
  IndexedDB.toArray()        // 读取全部 100K 条 → ~200ms
  → 逐条 turf.distance()    // CPU 计算 → ~80ms
  = O(n) IO + O(n) CPU

WebGeoDB 优化后（Plan A + Plan B）：
  R-tree.search(bboxBuffer)  // 内存查找候选集（19 条）→ 0.1ms
  → 直接返回 IndexItem.data  // 无 IO → 0ms
  = O(log n) + 0 IO
```

---

## 必须掌握的最佳实践

### 1. 必须先 `await createIndex()`，再执行空间查询

```typescript
// ✅ 正确流程
await db.open();
await db.features.insertMany(data);
await db.features.createIndex('geometry');  // 必须 await！
const results = await db.features
  .distance('geometry', [116.404, 39.915], '<', 200)
  .toArray();

// ❌ 错误：忘记 await，索引可能未完成，查询退化为全表扫描
db.features.createIndex('geometry');  // 无 await
const results = await db.features.distance(...);
```

> 没有创建索引时，`spatialIndex` 为 null，查询会退化为全表扫描（`path=fullScan`）。

### 2. 距离单位是**米**

```typescript
// ✅ 200 米范围
db.features.distance('geometry', [lng, lat], '<', 200)

// 内部自动换算：200m → 0.2km → turf.buffer(0.2, {units:'kilometers'})
```

### 3. SQL 空间查询同样走索引（Plan B，2026-03）

```typescript
// ✅ 已优化：SQL 中的 ST_Distance WHERE 子句走 R-tree 索引
await db.features.createIndex('geometry');

const results = await db.query(`
  SELECT * FROM features
  WHERE ST_Distance(geometry, ST_Point(116.404, 39.915)) < 200
`);
// 输出：[WebGeoDB] path=indexData, rtree: 0.1ms, total: 0.1ms

// 链式 API（等价，性能相同）
const results2 = await db.features
  .distance('geometry', [116.404, 39.915], '<', 200)
  .toArray();
```

### 4. 冷启动后需重建索引

数据库关闭再打开后，内存 R-tree 清空，需要重建：

```typescript
await db.open();
// 对有数据的表，重建索引（loadSpatialIndex 全量读取并重建）
await db.features.loadSpatialIndex('geometry');
// 或等价地：
await db.features.createIndex('geometry');
```

---

## 场景对比

### 场景 1：LBS 附近搜索（精确小范围，100K+ 数据）

```typescript
// WebGeoDB：~5ms（R-tree 内存过滤）
const nearby = await db.pois
  .distance('geometry', userLocation, '<', 500)
  .toArray();
```

**结论**：数据量越大、结果集越小，WebGeoDB 优势越显著。

### 场景 2：SQL 空间查询（PostGIS 兼容）

```typescript
// WebGeoDB SQL：~5ms（Plan B 走空间索引）
const results = await db.query(`
  SELECT id, name, ST_Distance(geometry, ST_Point(116.404, 39.915)) AS dist
  FROM features
  WHERE ST_Distance(geometry, ST_Point(116.404, 39.915)) < 500
  ORDER BY dist ASC
  LIMIT 10
`);
```

### 场景 3：大范围覆盖（结果集接近全量）

R-tree 仅起 bbox 粗过滤作用，候选集很大时，两者性能接近。

```typescript
// 覆盖全部数据时，WebGeoDB 优势减弱
const all = await db.features
  .distance('geometry', center, '<', 100000)
  .toArray();
```

### 场景 4：属性查询（不含空间条件）

```typescript
// 属性查询走 Dexie IDB 索引，无需空间索引
const restaurants = await db.features
  .where('type', '=', 'restaurant')
  .orderBy('rating', 'desc')
  .limit(10)
  .toArray();
```

---

## 内存使用

`IndexItem.data` 将完整记录存储在内存 R-tree 中（Plan A）：

| 数据量 | 典型内存占用 |
|--------|-----------|
| 10K 条 GeoJSON Point | ~5–10MB |
| 100K 条 GeoJSON Point | ~50–100MB |
| 100K 条 GeoJSON Polygon | ~100–500MB（视几何复杂度） |

**建议**：超过 500K 条记录时，评估是否需要 LRU 缓存限制（Plan A 扩展，待实现）。

---

## 性能监控

启用控制台日志（自动输出）：

```
[WebGeoDB] path=indexData, rtree: 0.1ms, total: 0.1ms, candidates: 19
```

| 路径标识 | 说明 | 性能 | 触发原因 |
|---------|------|------|---------|
| `path=indexData` | 所有候选有 data，直接返回 | 最快（0 IO） | 正常情况 |
| `path=anyOf(N)` | 部分候选缺 data，回查 IDB | 较慢 | 索引重建不完整 |
| `path=fullScan` | 无空间索引，全表扫描 | 最慢 | 未调用 createIndex() |

如果看到 `path=anyOf(N)` 或 `path=fullScan`，请检查：
1. 是否调用了 `await db.table.createIndex('geometry')`
2. 是否在打开数据库后调用了 `loadSpatialIndex()`
