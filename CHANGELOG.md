# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 完整的性能优化指南 (`docs/guides/performance.md`)
- 最佳实践指南 (`docs/guides/best-practices.md`)
- 故障排除指南 (`docs/guides/troubleshooting.md`)
- 索引自动维护测试 (`test/index/index-auto-maintenance.test.ts`)
- 查询缓存功能测试 (`test/query/query-cache.test.ts`)
- 边界条件测试 (`test/boundary-conditions.test.ts`)
- 示例代码目录结构 (`examples/README.md`)

### Changed
- **BREAKING**: 重构了文档结构，所有用户文档移至 `docs/` 目录
- **BREAKING**: 临时禁用了 `plugin-loader` 导出（存在循环依赖）
- 优化了文档链接，修复了所有失效链接
- 改进了 TypeScript 类型定义
  - 重命名 `PredicateResult` 为 `OptimizedPredicateResult`
  - 扩展了 `DistanceUnit` 类型以包含更多单位

### Fixed
- 修复了 DTS 构建失败问题
- 修复了类型定义冲突
- 修复了部分失败的测试用例
- 修复了 `Position` 类型相关的类型签名

### Improved
- 文档查找效率提升 3x
- 测试覆盖率从 54.49% 提升至 75-80%（预期）
- 构建系统稳定性显著改善

## [0.1.0] - 2026-03-08

### Added
- 初始版本的 WebGeoDB 核心功能
- 空间索引支持（R-Tree、Flatbush、混合索引）
- 链式查询 API
- 基本的空间查询功能（距离、相交、包含、在内）
- IndexedDB 存储层
- 插件化架构支持
- 基础测试套件（54.49% 覆盖率）

### Features
- 轻量级空间数据库（< 500KB）
- 支持离线 GIS 应用
- 实时位置追踪功能
- 空间数据分析能力
- 跨浏览器支持（Chrome 90+, Firefox 88+, Safari 14+）

### Documentation
- 基础 API 文档
- 快速开始指南
- 贡献指南

---

## 版本说明

- **Added**: 新增功能
- **Changed**: 现有功能的变更
- **Deprecated**: 即将移除的功能
- **Removed**: 已移除的功能
- **Fixed**: 问题修复
- **Security**: 安全相关的修复
