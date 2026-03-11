# WebGeoDB GitHub Issues 总体规划

## 📊 Issues 总览

**当前 Issues 总数**: 17 个

| 类别 | 数量 | Issues |
|------|------|--------|
| **Bug 修复** | 6 | #1, #2, #3, #4, #5, #6 |
| **功能改进** | 1 | #7 |
| **Phase 2: 查询转换器** | 4 | #8, #9, #10, #11 |
| **Phase 3: PostGIS 兼容** | 6 | #12, #13, #14, #15, #16, #17 |

---

## 🐛 Bug 修复 Issues（优先级排序）

### 第一优先级（High）- 立即处理

#### Issue #1: 空间查询测试失败 (6个失败用例)
- **类型**: Bug
- **优先级**: High
- **影响**: 核心空间查询功能
- **工作量**: 2-3 天
- **分支**: `bugfix/spatial-query-failures`

**失败测试**:
1. should find Point within Polygon
2. should support contains() with where()
3. should combine intersects with attribute filters
4. should handle empty geometries
5. should handle cross-shaped geometries
6. should handle large numbers of contains operations

**主要问题**:
- contains 谓词判断不准确
- intersects 谓词边界情况处理
- 空几何体过滤逻辑

---

### 第二优先级（Medium）- 本周处理

#### Issue #3: 空间引擎测试失败 (4个失败用例)
- **类型**: Bug
- **优先级**: Medium
- **影响**: 空间计算核心功能
- **工作量**: 1-2 天
- **分支**: `bugfix/spatial-engine-failures`

#### Issue #4: 查询缓存测试失败 (3个失败用例)
- **类型**: Bug
- **优先级**: Medium
- **影响**: 查询性能优化
- **工作量**: 1-2 天
- **分支**: `bugfix/query-cache-failures`

#### Issue #5: 索引自动维护测试失败 (3个失败用例)
- **类型**: Bug
- **优先级**: Medium
- **影响**: 索引维护功能
- **工作量**: 1-2 天
- **分支**: `bugfix/index-auto-maintenance`

#### Issue #7: DatabaseClosedError 测试清理问题
- **类型**: Feature
- **优先级**: Medium
- **影响**: 测试稳定性
- **工作量**: 1 天
- **分支**: `feature/test-cleanup-improvement`

#### Issue #2: 查询构建器边界情况测试失败 (3个失败用例)
- **类型**: Bug
- **优先级**: Medium
- **影响**: 查询构建器鲁棒性
- **工作量**: 1 天
- **分支**: `bugfix/query-builder-edge-cases`

---

### 第三优先级（Low）- 有空处理

#### Issue #6: 优化谓词测试失败 (2个失败用例)
- **类型**: Bug
- **优先级**: Low
- **影响**: 性能优化功能
- **工作量**: 0.5-1 天
- **分支**: `bugfix/optimization-predicates`

---

## 🚀 新功能开发 Issues

### Phase 2: 查询转换器（第 2-3 周）

#### Issue #8: SQLToQueryBuilderTranslator 基础框架
- **类型**: Feature
- **优先级**: High
- **工作量**: 2 天
- **分支**: `feature/sql-translator-framework`
- **依赖**: Phase 1

#### Issue #9: WHERE 子句转换
- **类型**: Feature
- **优先级**: High
- **工作量**: 2 天
- **分支**: `feature/where-clause-translator`
- **依赖**: Issue #8

#### Issue #10: ORDER BY 和 LIMIT/OFFSET 转换
- **类型**: Feature
- **优先级**: Medium
- **工作量**: 1.5 天
- **分支**: `feature/orderby-limit-translator`
- **依赖**: Issue #8

#### Issue #11: 查询转换器集成测试
- **类型**: Test
- **优先级**: High
- **工作量**: 1 天
- **分支**: `feature/sql-translator-integration-tests`
- **依赖**: Issue #8, #9, #10

**Phase 2 总工作量**: 约 6.5 天

---

### Phase 3: PostGIS 兼容（第 3-4 周）

#### Issue #12: PostGISFunctionRegistry 函数注册表
- **类型**: Feature
- **优先级**: High
- **工作量**: 1 天
- **分支**: `feature/postgis-function-registry`
- **依赖**: 无

#### Issue #13: 核心空间谓词函数
- **类型**: Feature
- **优先级**: High
- **工作量**: 2 天
- **分支**: `feature/postgis-spatial-predicates`
- **依赖**: Issue #12

#### Issue #14: 距离函数 (ST_DWithin, ST_Distance)
- **类型**: Feature
- **优先级**: High
- **工作量**: 1.5 天
- **分支**: `feature/postgis-distance-functions`
- **依赖**: Issue #12

#### Issue #15: 几何构造函数
- **类型**: Feature
- **优先级**: Medium
- **工作量**: 2 天
- **分支**: `feature/postgis-geometry-constructors`
- **依赖**: Issue #12

#### Issue #16: 格式转换函数 (WKT/WKB)
- **类型**: Feature
- **优先级**: Medium
- **工作量**: 1.5 天
- **分支**: `feature/postgis-format-converters`
- **依赖**: Issue #12

#### Issue #17: PostGIS 函数集成测试
- **类型**: Test
- **优先级**: High
- **工作量**: 1.5 天
- **分支**: `feature/postgis-integration-tests`
- **依赖**: Issue #12, #13, #14, #15, #16

**Phase 3 总工作量**: 约 9.5 天

---

## 📅 实施时间表

### 第 1 周：Bug 修复（高优先级）

| Day | Issue | 任务 |
|-----|-------|------|
| Day 1-3 | Issue #1 | 空间查询测试失败修复 |
| Day 4-5 | Issue #3 | 空间引擎测试失败修复 |

### 第 2 周：Bug 修复（中优先级）

| Day | Issue | 任务 |
|-----|-------|------|
| Day 1-2 | Issue #4 | 查询缓存测试失败修复 |
| Day 3-4 | Issue #5 | 索引自动维护测试失败修复 |
| Day 5 | Issue #7 | DatabaseClosedError 清理 |

### 第 3 周：Phase 2 基础

| Day | Issue | 任务 |
|-----|-------|------|
| Day 1-2 | Issue #8 | SQLToQueryBuilderTranslator 基础框架 |
| Day 3-4 | Issue #9 | WHERE 子句转换 |
| Day 5 | Issue #11 | 集成测试（部分）|

### 第 4 周：Phase 2 完成 + Phase 3 开始

| Day | Issue | 任务 |
|-----|-------|------|
| Day 1 | Issue #10 | ORDER BY 和 LIMIT/OFFSET 转换 |
| Day 1 | Issue #11 | 集成测试（完成）|
| Day 2 | Issue #12 | PostGISFunctionRegistry |
| Day 3-4 | Issue #13 | 核心空间谓词函数 |
| Day 5 | Issue #14 | 距离函数 |

### 第 5 周：Phase 3 完成

| Day | Issue | 任务 |
|-----|-------|------|
| Day 1-2 | Issue #15 | 几何构造函数 |
| Day 3 | Issue #16 | 格式转换函数 |
| Day 4-5 | Issue #17 | PostGIS 集成测试 |

### 第 6 周：收尾和优化

| Day | Issue | 任务 |
|-----|-------|------|
| Day 1 | Issue #2 | 查询构建器边界情况 |
| Day 2 | Issue #6 | 优化谓词测试失败 |
| Day 3-5 | 整体回归测试和文档完善 |

---

## 🎯 优先级矩阵

```
紧急程度
  ↑
高│ ╺━━━━━━━━━━━╸
  │  #1
  │  #8, #9, #11, #12, #13, #14, #17
中│  ╺━━━━━━━━━━━╸
  │  #2, #3, #4, #5, #7, #10, #15, #16
低│  ╺━━━━━━━━━╸
  │  #6
  └─────────────────────→ 重要程度
     低    中    高
```

---

## 📊 工作量统计

| 类别 | Issue 数 | 总工作量 |
|------|---------|---------|
| Bug 修复 | 6 | ~8-10 天 |
| 功能改进 | 1 | ~1 天 |
| Phase 2 | 4 | ~6.5 天 |
| Phase 3 | 6 | ~9.5 天 |
| **总计** | **17** | **~25-27 天** |

**建议团队规模**: 2-3 人
**预计完成时间**: 6 周（考虑代码审查、集成测试、文档）

---

## 🔧 快速开始指南

### 1. 查看 Issues

```bash
# 查看所有 Issues
gh issue list

# 查看特定 Issue
gh issue view 1

# 按标签过滤
gh issue list --label "bug,High"
```

### 2. 认领 Issue

```bash
# 认领 Issue #1
gh issue edit 1 --add-assignee "your-username"
```

### 3. 创建分支

```bash
# Bug 修复分支
git checkout -b bugfix/spatial-query-failures

# Feature 开发分支
git checkout -b feature/sql-translator-framework
```

### 4. 关联 Issue

```bash
# 在第一个 commit 中关联
git commit -m "feat(sql): initial setup

Closes #8"
```

### 5. 创建 PR

```bash
git push origin feature/sql-translator-framework
gh pr create --title "feat(sql): implement SQLToQueryBuilderTranslator" --body "Closes #8"
```

---

## 📚 相关文档

- **总体 Issues 总结**: `GITHUB_ISSUES_SUMMARY.md`
- **Phase 2 & 3 详细**: `PHASE2-3_ISSUES_SUMMARY.md`
- **Git 工作流**: `.claude/docs/git-workflow.md`
- **快速参考**: `GIT_WORKFLOW_QUICK_REFERENCE.md`
- **Bug 修复清单**: `.claude/docs/checklists/bug-fix.md`
- **功能开发清单**: `.claude/docs/checklists/feature-development.md`

---

## 🔗 在线链接

- **GitHub Issues**: https://github.com/webgeodb/webgeodb/issues
- **Milestone v1.0.0**: https://github.com/webgeodb/webgeodb/milestone/1

---

**更新时间**: 2026-03-11
**Issues 总数**: 17
**预计完成**: 2026-04-22（6 周）
