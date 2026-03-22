# WebGeoDB 技术架构

> 📅 更新时间: 2026-03-21

## 项目定位

WebGeoDB 是一个专为浏览器设计的轻量级空间数据库，核心特性：

- **存储层**：IndexedDB（通过 Dexie.js）
- **查询层**：链式 API + SQL/PostGIS 兼容
- **索引层**：R-tree（rbush）+ Flatbush 混合空间索引
- **体积目标**：< 300KB gzipped

---

## 核心架构

```
┌─────────────────────────────────────────────────┐
│              WebGeoDB API 层                      │
│  db.table.distance() / intersects() / within()   │
│  db.query('SELECT ... WHERE ST_Distance(...)')    │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│           查询引擎层                              │
│  ┌────────────────┐  ┌──────────────────────┐   │
│  │  QueryBuilder   │  │    SQL Executor       │   │
│  │  链式 API 翻译  │  │  (query-translator)   │   │
│  └────────┬───────┘  └──────────┬────────────┘   │
│           └──────────┬──────────┘               │
│                      │                           │
│          ┌───────────▼──────────────┐           │
│          │   空间索引层（内存）       │           │
│          │   HybridSpatialIndex      │           │
│          │   ┌────────┬──────────┐  │           │
│          │   │RTreeIdx│FlatbushIdx│  │           │
│          │   │(动态)  │(静态冻结) │  │           │
│          │   └────────┴──────────┘  │           │
│          │   IndexItem: {           │           │
│          │     id, bbox,            │           │
│          │     data: <完整记录>  ← Plan A │      │
│          │   }                      │           │
│          └───────────────────────────┘           │
└──────────────┬──────────────────────────────────┘
               │ 仅写入/未命中时访问
┌──────────────▼──────────────────────────────────┐
│              存储层（IndexedDB）                  │
│              Dexie.js + IndexedDB                │
└─────────────────────────────────────────────────┘
```

---

## 空间查询执行路径

### 链式 API（`db.table.distance()`）

```
db.features.distance('geometry', point, '<', 200)
  ↓
QueryBuilder.distance()
  ↓
HybridSpatialIndex.search(bboxBuffer)  // R-tree O(log n)
  ↓
candidates.every(item => item.data)    // Plan A: 检查内存数据
  ↓ 是（快路径）
直接返回 candidates.map(c => c.data)   // 0 IndexedDB IO
```

### SQL 空间查询（`db.query()`）—— Plan B

```
db.query('SELECT * FROM features WHERE ST_Distance(...) < 200')
  ↓
sql-parser.ts: 解析 SQL → AST
  ↓
query-translator.ts: 识别 ST_Distance WHERE 子句
  ↓
SQLExecutor.executeSelect()
  ↓ 传入 spatialIndices.get('features')（Plan B 修复）
QueryBuilder (含正确的 spatialIndex)
  ↓
HybridSpatialIndex.search(bboxBuffer)  // R-tree O(log n)
  ↓
直接返回 IndexItem.data               // 0 IndexedDB IO
```

---

## 关键设计决策

### Plan A：IndexItem 内存存储完整数据

**问题**：R-tree 仅存 `{id, bbox}`，查询需二次回查 IndexedDB（49 条记录 = 118ms）

**方案**：`IndexItem` 增加 `data?: any` 字段，insert/insertMany/loadSpatialIndex 时同时存入完整记录

**效果**：
- 查询路径：R-tree 搜索（1ms）→ 直接返回 `item.data`（0ms）
- 消除 IndexedDB 回查（省去 95–118ms）

**文件**：
- `src/types/geometry.ts` — `IndexItem.data?: any`
- `src/webgeodb.ts` — insert/insertMany/loadSpatialIndex 存 data
- `src/query/query-builder.ts` — 快路径检测 `item.data`

### Plan B：SQL 查询传入空间索引

**问题**：`webgeodb.ts` 调用 `SQLExecutor.execute()` 时传 `null` 作为 spatialIndex，所有 SQL 空间查询退化为全表扫描

**方案**：将 `spatialIndex: SpatialIndex | null` 改为 `spatialIndices: Map<string, SpatialIndex> | null`，在 `executeSelect()` 中按 `statement.from` 查找对应索引

**效果**：SQL `WHERE ST_Distance(...)` 现在走 R-tree，性能与链式 API 持平

**文件**：
- `src/sql/sql-executor.ts` — 接受 Map，按表名解析索引
- `src/webgeodb.ts` — 传 `this.spatialIndices` 代替 `null`

---

## 性能基准（Chrome，100K 数据，200m 查询半径）

| 方案 | 查询时间 | 对比 Dexie+Turf 全表扫描 |
|------|---------|----------------------|
| Dexie + Turf.js（全表） | 287ms | 基准 |
| WebGeoDB 链式 API（R-tree + IndexItem.data） | 4.7ms | **61x 更快** |
| WebGeoDB SQL 查询（Plan B，走索引） | 5.5ms | **52x 更快** |

> 查询路径日志：`[WebGeoDB] path=indexData, rtree: 0.1ms, total: 0.1ms`

---

## 项目结构

```
packages/core/src/
├── sql/                  # SQL 模块
│   ├── sql-parser.ts         # SQL 解析（node-sql-parser 包装）
│   ├── sql-executor.ts       # SQL 执行器（接受 spatialIndices Map）
│   ├── query-translator.ts   # SQL AST → QueryBuilder 转换
│   ├── postgis-functions.ts  # PostGIS 函数映射
│   └── aggregate-functions.ts # 聚合函数
├── query/                # 查询引擎
│   └── query-builder.ts      # 链式 API（含 indexData 快路径）
├── index/                # 空间索引
│   ├── spatial-index.ts      # 接口定义
│   ├── rtree-index.ts        # rbush R-tree（动态）
│   ├── flatbush-index.ts     # Flatbush（静态，序列化友好）
│   └── hybrid-index.ts       # 混合索引
├── storage/              # 存储层
│   └── indexeddb-storage.ts  # Dexie.js 封装
├── spatial/              # 空间计算
│   └── spatial-engine.ts     # Turf.js 封装
├── types/                # 类型定义
│   └── geometry.ts           # IndexItem（含 data 字段）
└── webgeodb.ts           # 主类
```

---

## 技术栈

| 依赖 | 用途 | 版本 |
|------|------|------|
| Dexie.js | IndexedDB 封装 | v3.2.4 |
| rbush | R-tree 动态空间索引 | v3.0.1 |
| flatbush | 静态空间索引（序列化支持） | v4.3.0 |
| @turf/turf | 地理空间精确计算 | v7.1.0 |
| node-sql-parser | SQL 解析 | latest |

## 构建输出

| 格式 | 文件 | 用途 |
|------|------|------|
| ESM | `dist/index.mjs` | 现代打包工具（Vite/webpack） |
| CJS | `dist/index.js` | Node.js/旧版打包工具 |
| IIFE | `dist/index.global.js` | 浏览器直接 `<script src>` 引入 |
| 类型 | `dist/index.d.ts` | TypeScript 类型提示 |
