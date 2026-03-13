# 覆盖率分析报告

> **生成时间**: 2026-03-13 01:21
> **测试总数**: 820 (726 passed, 94 failed)
> **覆盖率目标**: 80%
> **实际覆盖率**: 61.17%

---

## 📊 总体结果

| 指标 | 当前值 | 目标值 | 差距 | 状态 |
|------|--------|--------|------|------|
| **Statements** | 61.17% | 80% | -18.83% | ⚠️ 未达标 |
| **Branches** | 50.13% | 80% | -29.87% | ⚠️ 未达标 |
| **Functions** | 71.71% | 80% | -8.29% | 🟡 接近 |
| **Lines** | 61.48% | 80% | -18.52% | ⚠️ 未达标 |

**结论**: 整体覆盖率 61.17%，未达到 80% 目标，但相比基准 54.49% 提升了 **6.68%** ✅

---

## ✅ 已达标模块 (>80%)

| 模块 | Statements | Branches | Functions | Lines | 评级 |
|------|-----------|----------|-----------|-------|------|
| **storage/indexeddb-storage.ts** | 100% | 100% | 100% | 100% | ⭐⭐⭐⭐⭐ |
| **index/flatbush-index.ts** | 100% | 100% | 100% | 100% | ⭐⭐⭐⭐⭐ |
| **utils/cache.ts** | 100% | 100% | 100% | 100% | ⭐⭐⭐⭐⭐ |
| **spatial/engine-registry.ts** | 98.07% | 90.9% | 100% | 98% | ⭐⭐⭐⭐⭐ |
| **index/hybrid-index.ts** | 96.96% | 75% | 90.9% | 96.96% | ⭐⭐⭐⭐⭐ |
| **errors/index.ts** | 90.71% | 55.55% | 93.87% | 90.57% | ⭐⭐⭐⭐ |
| **query/multi-condition-optimizer.ts** | 84.28% | 60% | 100% | 83.07% | ⭐⭐⭐⭐ |
| **index/rtree-index.ts** | 83.33% | 100% | 80% | 83.33% | ⭐⭐⭐⭐ |

**亮点**:
- ✅ 存储层和缓存层完美覆盖 (100%)
- ✅ 引擎注册表接近完美 (98%)
- ✅ 查询优化器核心逻辑良好 (84%)

---

## 🟡 需要改进模块 (50-80%)

### 高优先级 (70-79%)

| 模块 | Statements | 问题 | 建议 |
|------|-----------|------|------|
| **sql/postgis-functions.ts** | 73.33% | 部分函数未实现 | 补充 ST_AsText, ST_Intersection 等函数 |
| **sql/cache.ts** | 73.49% | 缓存策略未完全测试 | 测试 LRU, TTL 策略 |
| **spatial/predicates/optimized-predicates.ts** | 73.58% | 边界情况覆盖不足 | 添加 null, undefined, 空几何测试 |
| **query/query-builder.ts** | 75.47% | 链式调用未完全覆盖 | 测试复杂链式查询 |
| **spatial/geometry-cache.ts** | 64.21% | 缓存策略未完全测试 | 测试缓存失效、更新、清除 |

### 中优先级 (50-69%)

| 模块 | Statements | 问题 | 建议 |
|------|-----------|------|------|
| **sql/sql-parser.ts** | 52.29% | 复杂 SQL 语法未覆盖 | 测试子查询、JOIN、UNION |
| **spatial/predicates/predicate-registry.ts** | 63% | 自定义谓词未测试 | 测试注册、覆盖、删除 |
| **spatial/engines/turf-engine.ts** | 59.58% | 拓扑操作未完全覆盖 | 测试 buffer, simplify, intersection |
| **spatial/predicates/advanced/advanced-predicates.ts** | 44.26% | 高级谓词未实现 | 实现 intersects, touches, crosses 等 |

---

## ⚠️ 严重不足模块 (<50%)

### 关键问题模块

| 模块 | Statements | 分支 | 函数 | 行数 | 问题 | 优先级 |
|------|-----------|------|------|------|------|--------|
| **sql/query-translator.ts** | 34.88% | 32.82% | 44.73% | 35.74% | WHERE, ORDER BY, LIMIT 未实现 | **P0** |
| **sql/sql-executor.ts** | 41.56% | 36.92% | 47.05% | 42.5% | 参数化查询、聚合函数未实现 | **P0** |
| **spatial/plugin-loader.ts** | 14.28% | 17.39% | 33.33% | 14.65% | 插件系统未测试 | **P1** |
| **spatial/topology/optimized-buffer.ts** | 1.68% | 0% | 0% | 2.08% | Buffer 操作未实现 | **P1** |
| **spatial/topology/optimized-distance.ts** | 1.44% | 0% | 0% | 1.49% | Distance 操作未实现 | **P1** |

---

## 🚀 最终建议

### 推荐方案: 混合策略

**Week 1: 核心功能完善**
1. 修复 94 个失败测试
2. 实现 SQL 核心功能 (WHERE, ORDER BY, LIMIT)
3. 实现参数化查询
4. 目标: 覆盖率达到 75%

**Week 2: 发布准备**
1. 构建优化 (目标 <300KB)
2. 发布 Beta 版到 npm
3. 准备技术文章和示例
4. 开始推广

**理由**:
- ✅ 快速推向市场，获取反馈
- ✅ 避免过度工程
- ✅ 数据驱动的功能优先级
- ✅ 建立活跃社区

---

**报告完成**: 2026-03-13 01:21
**建议**: 采用混合策略，2 周内发布 Beta 版本

---

## 📊 覆盖率详细数据

```
File                             | % Stmts | % Branch | % Funcs | % Lines |
---------------------------------|---------|----------|---------|---------|
All files                        |   61.17 |    50.13 |   71.71 |   61.48 |
 src/webgeodb.ts                 |    87.5 |    72.72 |     100 |    87.5 |
 src/errors/index.ts             |   90.71 |    55.55 |   93.87 |   90.57 |
 src/storage/indexeddb-storage.ts|     100 |      100 |     100 |     100 |
 src/index/flatbush-index.ts     |     100 |      100 |     100 |     100 |
 src/index/hybrid-index.ts       |   96.96 |       75 |    90.9 |   96.96 |
 src/index/rtree-index.ts        |   83.33 |      100 |      80 |   83.33 |
 src/query/multi-condition-optimizer.ts | 84.28 |   60 |     100 |   83.07 |
 src/query/query-builder.ts      |   75.47 |    58.33 |   92.59 |   75.15 |
 src/spatial/engine-registry.ts  |   98.07 |     90.9 |     100 |      98 |
 src/spatial/geometry-cache.ts   |   64.21 |    52.63 |    64.7 |   64.89 |
 src/spatial/plugin-loader.ts    |   14.28 |    17.39 |   33.33 |   14.65 |
 src/spatial/engines/turf-engine.ts | 59.58 |    50.98 |   80.48 |   59.49 |
 src/sql/cache.ts                |   73.49 |    54.16 |   73.91 |   72.83 |
 src/sql/postgis-functions.ts    |   73.33 |    60.52 |    77.5 |   77.77 |
 src/sql/query-translator.ts     |   34.88 |    32.82 |   44.73 |   35.74 |
 src/sql/sql-executor.ts         |   41.56 |    36.92 |   47.05 |   42.5 |
 src/sql/sql-parser.ts           |   52.29 |    50.69 |   56.66 |   52.9 |
```

**查看详细报告**: `open coverage/index.html`
