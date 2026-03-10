# WebGeoDB

**Spatial Database for the Modern Web**

一个专为浏览器设计的轻量级空间数据库,支持离线 GIS 应用、实时位置追踪和空间数据分析。

[![tests](https://img.shields.io/badge/tests-32%2F32%20passing-brightgreen)](./docs/reports/multi-browser-test-report.md)
[![coverage](https://img.shields.io/badge/coverage-75%25%2B-green)](./docs/reports/test-coverage.md)
[![browsers](https://img.shields.io/badge/browsers-Chromium%20%7C%20Firefox%20%7C%20WebKit-blue)](./docs/reports/multi-browser-test-report.md)

> 🌐 **[English README](./README_EN.md)** | 📖 **中文文档**

## 特性

- 🪶 **轻量级**: 核心包 < 500KB,比 SQLite WASM 小 50%
- ⚡ **高性能**: 查询响应时间 < 1s,支持 100MB-1GB 数据集
- 🔌 **可扩展**: 插件化架构,按需加载功能模块
- 📱 **离线优先**: 完整的离线支持,适合边缘计算
- 🛠️ **易用性**: 类 SQL API + 链式 API,学习成本低
- 🌐 **跨平台**: 支持现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+)

## 快速开始

```bash
# 安装核心包
pnpm add @webgeodb/core

# 或使用 npm
npm install @webgeodb/core
```

```typescript
import { WebGeoDB } from '@webgeodb/core';

// 创建数据库实例
const db = new WebGeoDB({
  name: 'my-geo-db',
  version: 1
});

// 定义表结构
db.schema({
  features: {
    id: 'string',
    name: 'string',
    type: 'string',
    geometry: 'geometry',
    properties: 'json'
  }
});

// 打开数据库
await db.open();

// 插入数据
await db.features.insert({
  id: '1',
  name: 'Point A',
  type: 'poi',
  geometry: {
    type: 'Point',
    coordinates: [30, 10]
  }
});

// 空间查询
const results = await db.features
  .where('type', '=', 'poi')
  .distance('geometry', [30, 10], '<', 1000)
  .limit(10)
  .toArray();
```

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                    应用层 (Application)                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 查询层 (Query Engine)                    │
│  - 类 SQL 查询 API                                       │
│  - 链式查询 API                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────┬──────────────────────────────────┐
│   空间索引 (Index)    │      几何计算 (Compute)          │
│  - rbush (动态)       │  - Turf.js 核心                  │
│  - flatbush (静态)    │  - JSTS (按需加载)               │
└──────────────────────┴──────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    存储层 (Storage)                      │
│  - IndexedDB (Dexie.js 封装)                            │
└─────────────────────────────────────────────────────────┘
```

## 包结构

### 核心包 ✅

- `@webgeodb/core` - 核心引擎 (< 300KB) ✅ 已发布
  - ✅ 存储层 (IndexedDB + Dexie.js)
  - ✅ 查询引擎 (链式 API)
  - ✅ 空间索引 (R-tree + Static)
  - ✅ 几何计算 (Turf.js)

### 扩展包 (开发中)

- `@webgeodb/plugin-topology` - 拓扑操作 (计划中)
- `@webgeodb/plugin-3d` - 三维支持 (计划中)
- `@webgeodb/plugin-temporal` - 时空数据 (计划中)
- `@webgeodb/plugin-network` - 网络分析 (计划中)
- `@webgeodb/plugin-raster` - 栅格数据 (计划中)

### 框架集成 (计划中)

- `@webgeodb/react` - React Hooks
- `@webgeodb/vue` - Vue Composables
- `@webgeodb/angular` - Angular Services
- `@webgeodb/svelte` - Svelte Stores

### 开发工具 (计划中)

- `@webgeodb/cli` - CLI 工具
- `@webgeodb/devtools` - DevTools 扩展
- `@webgeodb/vscode` - VS Code 扩展

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 测试 (浏览器自动化)
pnpm test              # 运行所有测试
pnpm test:ui           # UI 模式
pnpm test:all          # 所有浏览器
pnpm test:coverage     # 覆盖率报告

# 代码检查
pnpm lint
```

### 测试状态

| 指标 | 状态 |
|------|------|
| **测试通过率** | ✅ 100% (10/10) |
| **多浏览器支持** | ✅ Chromium, Firefox, WebKit |
| **代码覆盖率** | 54.49% (目标: 80%) |
| **CI/CD** | ✅ GitHub Actions |

详见:
- [测试指南](./packages/core/TESTING.md)
- [多浏览器测试报告](./docs/reports/multi-browser-test-report.md)
- [覆盖率报告](./docs/reports/test-coverage.md)

## 文档

### 🎓 入门教程系列

**从零到精通的完整学习路径** - 5个章节 + 5个专题应用

| 章节 | 标题 | 学习时间 | 内容 |
|------|------|----------|------|
| 第1章 | [快速上手入门](./docs/tutorials/zh/chapter-01-getting-started.md) | 30-45分钟 | 环境准备、数据库创建、CRUD操作、几何类型 |
| 第2章 | [空间查询实战](./docs/tutorials/zh/chapter-02-spatial-queries.md) | 45-60分钟 | 属性查询、空间谓词、索引优化、复杂查询 |
| 第3章 | [高级特性与优化](./docs/tutorials/zh/chapter-03-advanced-features.md) | 60-90分钟 | 几何计算、事务管理、性能优化、数据导入导出 |
| 第4章 | [实际应用场景](./docs/tutorials/zh/chapter-04-real-world-apps.md) | 90-120分钟 | 应用架构、地图集成、实时追踪、离线支持 |
| 第5章 | [生产环境最佳实践](./docs/tutorials/zh/chapter-05-production-ready.md) | 60-90分钟 | 生产配置、安全性、测试策略、监控部署 |

**专题应用** - 完整的行业解决方案示例：

| 应用 | 描述 | 技术亮点 |
|------|------|----------|
| [电商地理围栏营销](./docs/tutorials/zh/projects/geo-fencing.md) | 位置驱动的智能营销系统 | 多边形围栏、实时位置检测、热力图分析 |
| [智慧城市基础设施](./docs/tutorials/zh/projects/smart-city.md) | 城市设施数字化管理 | 网络分析、缓冲区分析、多层叠加 |
| [环境监测平台](./docs/tutorials/zh/projects/environmental-monitoring.md) | 时空数据采集与分析 | 空间插值、动态可视化、等值线生成 |
| [物流配送优化](./docs/tutorials/zh/projects/logistics.md) | 智能配送路径规划 | Voronoi图、TSP优化、实时追踪 |
| [社交位置分享](./docs/tutorials/zh/projects/social-location.md) | 隐私保护的社交平台 | 位置模糊化、推荐算法、大规模并发 |

> 💡 **英文文档**: [English Tutorials](./docs/tutorials/en/)

### 项目文档

- [项目概览](./docs/architecture/overview.md) - 项目概述和设计理念
- [架构说明](./docs/architecture/structure.md) - 代码结构和模块划分
- [贡献指南](./CONTRIBUTING.md) - 如何贡献代码
- [实施报告](./docs/reports/browser-automation-success.md) - 测试基础设施实施

### 用户文档

- [快速开始](./docs/getting-started.md) - 快速上手指南
- [API 参考](./docs/api/reference.md) - 完整的 API 文档
- [空间引擎指南](./docs/api/spatial-engine.md) - 空间引擎详解
- [迁移指南](./docs/guides/migration.md) - 从其他数据库迁移
- [自定义引擎开发](./docs/guides/custom-engine.md) - 开发自定义空间引擎
- [最佳实践](./docs/guides/best-practices.md) - 数据建模和生产环境配置
- [性能优化](./docs/guides/performance.md) - 索引选择、查询优化
- [故障排除](./docs/guides/troubleshooting.md) - 常见问题、调试技巧

## 示例

### 📚 教程示例

配合入门教程系列的完整可运行示例：

**第1章 - 快速上手入门**:
- [01-first-database](./examples/tutorial-01/01-first-database) - 创建第一个数据库
- [02-basic-crud](./examples/tutorial-01/02-basic-crud) - CRUD基础操作
- [03-place-markers](./examples/tutorial-01/03-place-markers) - 个人地点标记系统

**第2章 - 空间查询实战**:
- [01-property-queries](./examples/tutorial-02/01-property-queries) - 属性查询进阶
- [02-spatial-predicates](./examples/tutorial-02/02-spatial-predicates) - 空间谓词详解
- [03-real-estate-app](./examples/tutorial-02/03-real-estate-app) - 房地产搜索应用
- [在线演示](./examples/tutorial-02/demos/) - 空间谓词交互式演示

**第3章 - 高级特性与优化**:
- [01-geometry-compute](./examples/tutorial-03/01-geometry-compute) - 几何计算引擎
- [02-transactions](./examples/tutorial-03/02-transactions) - 事务管理
- [03-performance-opt](./examples/tutorial-03/03-performance-opt) - 性能优化

**第4章 - 实际应用场景**:
- [01-offline-map](./examples/tutorial-04/01-offline-map) - 离线地图应用
- [02-location-tracking](./examples/tutorial-04/02-location-tracking) - 实时位置追踪
- [03-fitness-tracker](./examples/tutorial-04/03-fitness-tracker) - 户外运动追踪器
- [在线演示](./examples/tutorial-04/demos/) - 完整应用演示

**第5章 - 生产环境最佳实践**:
- [01-production-config](./examples/tutorial-05/01-production-config) - 生产环境配置
- [02-security](./examples/tutorial-05/02-security) - 安全性示例
- [03-monitoring](./examples/tutorial-05/03-monitoring) - 性能监控

### 🚀 专题应用示例

完整的生产级应用示例：
- [电商地理围栏营销系统](./examples/projects/geo-fencing) - 地理围栏 + 营销规则引擎
- [智慧城市基础设施管理](./examples/projects/smart-city) - 网络分析 + 空间统计
- [环境监测数据平台](./examples/projects/environmental-monitoring) - 时空数据 + 插值分析
- [物流配送优化系统](./examples/projects/logistics) - Voronoi图 + 路径优化
- [社交地理信息分享](./examples/projects/social-location) - 隐私保护 + 推荐算法
- [在线演示](./examples/projects/demos/) - 所有专题应用演示

### 其他示例

- [基础 CRUD 操作](./examples/basic-usage) - 简单的增删改查示例

## 路线图

### ✅ Phase 1: 核心引擎 (已完成)

**完成日期**: 2026-03-08

- [x] 项目初始化 (Monorepo + Turbo)
- [x] 存储层实现 (IndexedDB + Dexie.js)
  - [x] CRUD 操作 (100% 测试覆盖)
  - [x] 批量操作 (insertMany, deleteMany)
  - [x] 事务支持
- [x] 空间索引实现
  - [x] R-Tree 索引 (rbush)
  - [x] 静态索引 (flatbush)
  - [x] 混合索引 (HybridSpatialIndex)
- [x] 查询引擎实现
  - [x] 链式查询 API (where, orderBy, limit)
  - [x] 多条件查询 (嵌套属性支持)
  - [x] 距离查询 (distance)
  - [x] 排序和分页
- [x] 几何计算集成 (Turf.js)
- [x] 测试基础设施
  - [x] 浏览器自动化测试 (Vitest + Playwright)
  - [x] 多浏览器支持 (Chromium, Firefox, WebKit)
  - [x] CI/CD 配置 (GitHub Actions)
  - [x] 测试覆盖率报告 (54.49%)

**成果**:
- ✅ 10/10 测试全部通过
- ✅ 3 大浏览器兼容
- ✅ 核心功能 100% 可用
- ✅ 完整的测试和文档体系

---

### 🔄 Phase 2: 测试完善 (进行中)

**目标**: 提升测试覆盖率到 80%，完善空间查询功能

- [x] 基础 CRUD 测试 (100%)
- [x] 多条件查询测试
- [ ] 高级空间查询测试
  - [ ] intersects (相交查询)
  - [ ] contains (包含查询)
  - [ ] within (在内查询)
- [ ] 空间索引测试
  - [ ] 索引创建和自动维护
  - [ ] 索引性能测试
- [ ] 边界条件测试
  - [ ] 空数据集
  - [ ] 大数据集
  - [ ] 异常输入

**预期完成**: 2026-03-15
**预期覆盖率**: 80%+

---

### 📋 Phase 3: 扩展功能 (计划中)

**预计开始**: 2026-03-15
**预计工期**: 4-6 周

- [ ] 精确拓扑操作 (JSTS 集成)
  - [ ] buffer, intersect, union, difference
  - [ ] 拓扑关系验证
- [ ] 扩展数据格式
  - [ ] WKT/WKB 支持
  - [ ] GeoJSON 完整支持
  - [ ] MVT 矢量瓦片
- [ ] 三维数据支持
  - [ ] 3D 几何类型
  - [ ] 3D 空间查询
  - [ ] 3D 可视化集成

---

### ⚡ Phase 4: 性能优化 (计划中)

**预计开始**: 2026-04-15
**预计工期**: 2-4 周

- [ ] 查询缓存机制
  - [ ] LRU 缓存
  - [ ] 智能缓存失效
- [ ] Web Worker 并行处理
  - [ ] 后台查询执行
  - [ ] 并行空间计算
- [ ] 性能基准测试
  - [ ] 查询性能基准
  - [ ] 索引性能对比
  - [ ] 大数据集测试 (100MB+)

---

### 🌐 Phase 5: 离线支持 (计划中)

**预计开始**: 2026-05-01
**预计工期**: 2 周

- [ ] Service Worker 集成
  - [ ] 离线数据同步
  - [ ] 增量更新
- [ ] Background Sync API
  - [ ] 自动同步队列
  - [ ] 冲突解决策略
- [ ] 发布 1.0 版本
  - [ ] 完整 API 文档
  - [ ] 使用示例
  - [ ] 最佳实践指南

---

## 📊 项目进度

**总体进度**: 40% (Phase 1 完成)

```
Phase 1: ████████████████████ 100% (核心引擎)
Phase 2: ██░░░░░░░░░░░░░░░░░  20% (测试完善)
Phase 3: ░░░░░░░░░░░░░░░░░░░   0% (扩展功能)
Phase 4: ░░░░░░░░░░░░░░░░░░░   0% (性能优化)
Phase 5: ░░░░░░░░░░░░░░░░░░░   0% (离线支持)
```

## 贡献

欢迎贡献! 请阅读 [贡献指南](./CONTRIBUTING.md)。

## 许可证

MIT License - 详见 [LICENSE](./LICENSE)

## 致谢

感谢以下开源项目:

### 核心依赖
- [Dexie.js](https://dexie.org/) - IndexedDB 封装
- [rbush](https://github.com/mourner/rbush) - R-tree 空间索引
- [flatbush](https://github.com/mourner/flatbush) - 静态空间索引
- [Turf.js](https://turfjs.org/) - 地理空间分析
- [JSTS](https://github.com/bjornharrtell/jsts) - 拓扑操作
- [proj4js](http://proj4js.org/) - 坐标转换

### 开发工具
- [Vitest](https://vitest.dev/) - 测试框架
- [Playwright](https://playwright.dev/) - 浏览器自动化
- [Turbo](https://turbo.build/) - Monorepo 构建工具
- [TypeScript](https://www.typescriptlang.org/) - 类型系统
