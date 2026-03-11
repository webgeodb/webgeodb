# SQL 功能文档更新计划

## 📋 文档状态评估

### ✅ 已创建的 SQL 文档

1. **`packages/core/docs/sql-guide.md`** ✅
   - SQL 功能使用指南
   - 包含完整的 API 说明和示例
   - PostGIS 函数参考

2. **`packages/core/docs/sql-verification-report.md`** ✅
   - 功能验证报告
   - 测试结果统计

3. **`packages/core/examples/sql-example.ts`** ✅
   - 可运行的代码示例

4. **`packages/core/SQL_FEATURE_VERIFICATION.md`** ✅
   - 验证总结报告

### 📝 需要更新的文档

1. **主 README.md** (`/README.md`)
   - [ ] 在特性部分添加 SQL 查询支持
   - [ ] 在快速开始部分添加 SQL 示例
   - [ ] 在架构图添加 SQL 解析层
   - [ ] 更新包结构说明
   - [ ] 更新路线图（标记 SQL 功能已完成）

2. **packages/core/README.md** (需要创建)
   - [ ] 核心包专门说明
   - [ ] SQL 功能介绍
   - [ ] API 快速参考
   - [ ] 性能特性说明

3. **docs/api/reference.md**
   - [ ] 添加 SQL 相关 API 文档
   - [ ] `query()` 方法说明
   - [ ] `prepare()` 方法说明
   - [ ] `explain()` 方法说明
   - [ ] 缓存管理方法说明

4. **docs/getting-started.md**
   - [ ] 添加 SQL 查询示例
   - [ ] 对比链式 API 和 SQL API

5. **CHANGELOG.md** (需要创建)
   - [ ] 记录 SQL 功能的添加
   - [ ] 版本更新说明
   - [ ] 破坏性变更说明

### 🆕 建议新增的文档

1. **packages/core/docs/sql-migration-guide.md**
   - 从链式 API 迁移到 SQL API
   - 对比两种 API 的优劣
   - 迁移最佳实践

2. **packages/core/docs/sql-best-practices.md**
   - SQL 查询最佳实践
   - 性能优化建议
   - 常见问题解决方案

3. **packages/core/docs/sql-vs-chain-api.md**
   - SQL API vs 链式 API 对比
   - 使用场景建议
   - 性能对比

4. **packages/core/docs/postgis-compatibility.md**
   - PostGIS 函数兼容性说明
   - 支持的函数列表
   - 不支持的函数及替代方案

## 🎯 优先级

### 高优先级（必须）

1. ✅ 更新主 README.md
2. ✅ 创建 packages/core/README.md
3. ✅ 更新 docs/api/reference.md

### 中优先级（推荐）

1. 创建 CHANGELOG.md
2. 创建 SQL 迁移指南
3. 创建 SQL 最佳实践文档

### 低优先级（可选）

1. 创建 SQL vs 链式 API 对比文档
2. 创建 PostGIS 兼容性文档
3. 更新教程示例以包含 SQL 用法

## 📝 待更新文档清单

| 文档 | 状态 | 优先级 |
|------|------|--------|
| 主 README.md | 待更新 | 高 |
| packages/core/README.md | 待创建 | 高 |
| docs/api/reference.md | 待更新 | 高 |
| docs/getting-started.md | 待更新 | 中 |
| CHANGELOG.md | 待创建 | 中 |
| SQL 迁移指南 | 待创建 | 中 |
| SQL 最佳实践 | 待创建 | 中 |
| SQL vs 链式 API | 待创建 | 低 |
| PostGIS 兼容性 | 待创建 | 低 |
| 更新教程示例 | 待更新 | 低 |
