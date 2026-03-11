# Phase 2 & 3 Issues 创建总结

## ✅ 创建完成

成功创建了 **10 个 GitHub Issues**，涵盖 Phase 2（查询转换器）和 Phase 3（PostGIS 兼容）的所有功能。

---

## 📊 Issues 总览

| Issue | 标题 | 类型 | 优先级 | 工作量 |
|-------|------|------|--------|--------|
| #8 | 实现 SQLToQueryBuilderTranslator 基础框架 | Feature | High | 2 天 |
| #9 | 实现 WHERE 子句到 QueryBuilder 的转换 | Feature | High | 2 天 |
| #10 | 实现 ORDER BY 和 LIMIT/OFFSET 转换 | Feature | Medium | 1.5 天 |
| #11 | 添加查询转换器集成测试 | Test | High | 1 天 |
| #12 | 实现 PostGISFunctionRegistry 函数注册表 | Feature | High | 1 天 |
| #13 | 实现核心 PostGIS 空间谓词函数 | Feature | High | 2 天 |
| #14 | 实现 PostGIS 距离函数 | Feature | High | 1.5 天 |
| #15 | 实现 PostGIS 几何构造函数 | Feature | Medium | 2 天 |
| #16 | 实现 PostGIS 格式转换函数 (WKT/WKB) | Feature | Medium | 1.5 天 |
| #17 | 添加 PostGIS 函数集成测试 | Test | High | 1.5 天 |

**总工作量**: 约 18 天

---

## 🔄 Phase 2: 查询转换器（4 个 Issues）

### Issue #8: SQLToQueryBuilderTranslator 基础框架

**目标**: 实现 SQL AST 到 QueryBuilder 的核心转换器

**关键内容**:
- 实现 `SQLToQueryBuilderTranslator` 类
- 支持 SELECT 语句转换
- 支持表名映射和列选择器
- 单元测试覆盖率 ≥ 80%

**关键文件**:
- `packages/core/src/sql/query-translator.ts`
- `packages/core/src/sql/ast-nodes.ts`
- `packages/core/test/sql/query-translator.test.ts`

**依赖**: Phase 1 (SQL 解析器)

---

### Issue #9: WHERE 子句转换

**目标**: 实现 SQL WHERE 子句到 QueryBuilder where() 方法的转换

**关键内容**:
- 支持比较运算符：=, !=, <, >, <=, >=
- 支持逻辑运算符：AND, OR, NOT
- 支持参数化查询（?, $1）
- 支持复杂嵌套条件

**示例转换**:
```sql
-- SQL
WHERE type = 'poi' AND rating >= 4.0

-- QueryBuilder
where('type', '=', 'poi').where('rating', '>=', 4.0)
```

**依赖**: Issue #8

---

### Issue #10: ORDER BY 和 LIMIT/OFFSET 转换

**目标**: 实现 ORDER BY、LIMIT 和 OFFSET 子句转换

**关键内容**:
- 支持 ORDER BY 单列和多列排序
- 支持 ASC 和 DESC 排序
- 支持 LIMIT 和 OFFSET 子句

**示例转换**:
```sql
-- SQL
ORDER BY rating DESC LIMIT 10 OFFSET 20

-- QueryBuilder
orderBy('rating', 'DESC').limit(10).offset(20)
```

**依赖**: Issue #8

---

### Issue #11: 查询转换器集成测试

**目标**: 为查询转换器添加完整的集成测试

**测试场景**:
- 简单查询转换
- 复杂查询（多条件、多排序）
- 参数化查询
- 边界情况和错误处理

**依赖**: Issue #8, #9, #10

---

## 🌍 Phase 3: PostGIS 兼容（6 个 Issues）

### Issue #12: PostGISFunctionRegistry 函数注册表

**目标**: 实现 PostGIS 函数注册表，管理函数映射关系

**关键内容**:
- 实现 `PostGISFunctionRegistry` 类
- 支持函数注册和查询
- 支持函数别名映射

**技术方案**:
```typescript
class PostGISFunctionRegistry {
  register(name: string, mapping: PostGISFunctionMapping)
  get(name: string): PostGISFunctionMapping
  has(name: string): boolean
}
```

**依赖**: 无

---

### Issue #13: 核心空间谓词函数

**目标**: 实现核心 PostGIS 空间谓词函数映射

**支持的函数**:
- `ST_Intersects` - 相交判断
- `ST_Contains` - 包含判断
- `ST_Within` - 在内部判断
- `ST_Equals` - 相等判断
- `ST_Disjoint` - 不相交判断

**示例转换**:
```sql
-- SQL
WHERE ST_Intersects(geometry, ST_MakePoint(116.4, 39.9))

-- QueryBuilder
intersects('geometry', [116.4, 39.9])
```

**依赖**: Issue #12

---

### Issue #14: 距离函数

**目标**: 实现 PostGIS 距离相关函数映射

**支持的函数**:
- `ST_DWithin` - 距离范围内判断
- `ST_Distance` - 距离计算

**示例转换**:
```sql
-- SQL
WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)

-- QueryBuilder
distance('geometry', [116.4, 39.9], '<=', 1000)
```

**依赖**: Issue #12

---

### Issue #15: 几何构造函数

**目标**: 实现 PostGIS 几何构造函数映射

**支持的函数**:
- `ST_MakePoint` - 创建点
- `ST_MakeLine` - 创建线
- `ST_Buffer` - 缓冲区
- `ST_Centroid` - 中心点

**技术实现**:
```typescript
import * as turf from '@turf/turf';

const GEOMETRY_CONSTRUCTORS = {
  'ST_MAKEPOINT': (x, y) => turf.point([x, y]),
  'ST_BUFFER': (geometry, radius, units) => turf.buffer(geometry, radius, { units }),
  'ST_CENTROID': (geometry) => turf.centroid(geometry),
};
```

**依赖**: Issue #12

---

### Issue #16: 格式转换函数

**目标**: 实现 PostGIS 格式转换函数映射

**支持的函数**:
- `ST_GeomFromText` - WKT 转 GeoJSON
- `ST_AsText` - GeoJSON 转 WKT
- `ST_AsBinary` - GeoJSON 转 WKB

**技术实现**:
```typescript
import wellknown from 'wellknown';

const FORMAT_CONVERTERS = {
  'ST_GEOMFROMTEXT': (wkt) => wellknown.parse(wkt),
  'ST_ASTEXT': (geojson) => wellknown.stringify(geojson),
};
```

**依赖**: Issue #12

---

### Issue #17: PostGIS 函数集成测试

**目标**: 为 PostGIS 函数映射添加完整的集成测试

**测试场景**:
- 空间谓词查询
- 距离查询
- 复杂嵌套函数
- 混合查询（PostGIS + 属性过滤）
- 格式转换

**示例测试**:
```typescript
// 空间谓词
await db.query(`
  SELECT * FROM features
  WHERE ST_Intersects(geometry, ST_MakePoint(116.4, 39.9))
`)

// 复杂嵌套
await db.query(`
  SELECT * FROM features
  WHERE ST_Intersects(
    geometry,
    ST_Buffer(ST_MakePoint(116.4, 39.9), 500)
  )
`)

// 混合查询
await db.query(`
  SELECT * FROM features
  WHERE type = ? AND ST_DWithin(geometry, ST_MakePoint(?, ?), 1000)
`, ['poi', 116.4, 39.9])
```

**依赖**: Issue #12, #13, #14, #15, #16

---

## 🎯 依赖关系图

```
Phase 2: 查询转换器
├── #8: SQLToQueryBuilderTranslator (基础框架)
│   ├── #9: WHERE 子句转换
│   └── #10: ORDER BY 和 LIMIT/OFFSET 转换
└── #11: 集成测试 (依赖 #8, #9, #10)

Phase 3: PostGIS 兼容
├── #12: PostGISFunctionRegistry (基础框架)
│   ├── #13: 核心空间谓词函数
│   ├── #14: 距离函数
│   ├── #15: 几何构造函数
│   └── #16: 格式转换函数
└── #17: 集成测试 (依赖 #12-16)
```

---

## 📋 实施建议

### 第一优先级（High）

**Phase 2 基础（第 2-3 周）**:
1. Issue #8 - SQLToQueryBuilderTranslator 基础框架（2 天）
2. Issue #9 - WHERE 子句转换（2 天）
3. Issue #11 - 集成测试（1 天）

**Phase 3 基础（第 3-4 周）**:
4. Issue #12 - PostGISFunctionRegistry（1 天）
5. Issue #13 - 核心空间谓词函数（2 天）
6. Issue #14 - 距离函数（1.5 天）
7. Issue #17 - 集成测试（1.5 天）

### 第二优先级（Medium）

8. Issue #10 - ORDER BY 和 LIMIT/OFFSET 转换（1.5 天）
9. Issue #15 - 几何构造函数（2 天）
10. Issue #16 - 格式转换函数（1.5 天）

---

## 🔧 快速开始

### 1. 认领 Issue

```bash
# 示例：认领 Issue #8
gh issue edit 8 --add-assignee "your-username"
```

### 2. 创建分支

```bash
git checkout main
git pull origin main
git checkout -b feature/sql-translator-framework

# 关联 Issue
git commit -m "feat(sql): initial setup

Closes #8"
```

### 3. 开发和测试

遵循 `.claude/docs/checklists/feature-development.md`

### 4. 创建 PR

```bash
git push origin feature/sql-translator-framework
gh pr create --title "feat(sql): implement SQLToQueryBuilderTranslator" --body "Closes #8"
```

---

## 📊 总体进度

| Phase | Issues | 总工作量 | 状态 |
|-------|--------|---------|------|
| Phase 1 | (SQL 解析器) | 2 周 | 待实施 |
| **Phase 2** | **4** | **~6.5 天** | **📋 已规划** |
| **Phase 3** | **6** | **~9.5 天** | **📋 已规划** |
| Phase 4 | (执行器和优化) | 2 周 | 待规划 |
| Phase 5 | (WebGeoDB 集成) | 2 周 | 待规划 |

---

## 🔗 相关文档

- **完整实施计划**: `/Users/zhangyuting/.claude/plans/federated-discovering-quilt.md`
- **Git 工作流**: `.claude/docs/git-workflow.md`
- **功能开发清单**: `.claude/docs/checklists/feature-development.md`
- **Issues 快速参考**: `GIT_WORKFLOW_QUICK_REFERENCE.md`
- **所有 Issues**: `https://github.com/webgeodb/webgeodb/issues`

---

## 📝 注意事项

1. **依赖顺序**: 严格按照依赖关系实施，先实现基础框架，再实现依赖功能
2. **测试覆盖**: 所有功能必须达到 80%+ 的测试覆盖率
3. **代码审查**: 每个 Issue 创建独立的 PR，独立审查
4. **文档更新**: 实施过程中及时更新相关文档

---

**创建时间**: 2026-03-11
**创建者**: Claude Code
**Issues 总数**: 10 (Phase 2: 4, Phase 3: 6)
**总工作量**: 约 18 天
