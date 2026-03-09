# WebGeoDB 项目结构

```
webgeodb/
├── packages/
│   └── core/                           # 核心包 (@webgeodb/core)
│       ├── src/
│       │   ├── types/                  # 类型定义
│       │   │   ├── geometry.ts         # 几何类型 (Point, LineString, Polygon, etc.)
│       │   │   ├── database.ts         # 数据库配置类型
│       │   │   └── index.ts            # 类型导出
│       │   ├── utils/                  # 工具函数
│       │   │   ├── bbox.ts             # 边界框计算和操作
│       │   │   ├── cache.ts            # LRU 缓存实现
│       │   │   └── index.ts            # 工具导出
│       │   ├── index/                  # 空间索引
│       │   │   ├── spatial-index.ts    # 空间索引接口
│       │   │   ├── rtree-index.ts      # R-tree 动态索引
│       │   │   ├── flatbush-index.ts   # Flatbush 静态索引
│       │   │   ├── hybrid-index.ts     # 混合索引策略
│       │   │   └── index.ts            # 索引导出
│       │   ├── storage/                # 存储层
│       │   │   ├── indexeddb-storage.ts # IndexedDB 适配器
│       │   │   └── index.ts            # 存储导出
│       │   ├── query/                  # 查询引擎
│       │   │   ├── query-builder.ts    # 查询构建器
│       │   │   └── index.ts            # 查询导出
│       │   ├── webgeodb.ts             # 核心数据库类
│       │   └── index.ts                # 主导出文件
│       ├── test/
│       │   └── webgeodb.test.ts        # 单元测试
│       ├── package.json                # 包配置
│       ├── tsconfig.json               # TypeScript 配置
│       └── vitest.config.ts            # 测试配置
├── examples/
│   └── basic-usage/                    # 基础使用示例
│       ├── index.ts                    # 示例代码
│       └── package.json                # 示例配置
├── docs/
│   └── getting-started.md              # 快速开始指南
├── package.json                        # 根配置 (Monorepo)
├── turbo.json                          # Turbo 构建配置
├── .gitignore                          # Git 忽略文件
├── README.md                           # 项目说明
├── LICENSE                             # MIT 许可证
├── CONTRIBUTING.md                     # 贡献指南
└── PROJECT_SUMMARY.md                  # 项目总结
```

## 文件说明

### 核心包 (packages/core)

#### 类型定义 (src/types/)
- **geometry.ts**: GeoJSON 几何类型定义
  - Position, Point, LineString, Polygon
  - MultiPoint, MultiLineString, MultiPolygon
  - GeometryCollection, Feature, FeatureCollection
  - BBox, IndexItem

- **database.ts**: 数据库相关类型
  - DatabaseConfig, TableSchema, IndexConfig
  - QueryOperator, SpatialPredicate
  - QueryCondition, SpatialQueryCondition

#### 工具函数 (src/utils/)
- **bbox.ts**: 边界框操作
  - getBBox() - 计算几何对象的边界框
  - bboxIntersects() - 检查边界框相交
  - bboxContains() - 检查边界框包含
  - bboxUnion() - 边界框并集
  - bboxIntersection() - 边界框交集

- **cache.ts**: LRU 缓存
  - LRUCache 类实现

#### 空间索引 (src/index/)
- **spatial-index.ts**: 空间索引接口定义
- **rtree-index.ts**: R-tree 动态索引 (基于 rbush)
- **flatbush-index.ts**: Flatbush 静态索引
- **hybrid-index.ts**: 混合索引 (动态 + 静态)

#### 存储层 (src/storage/)
- **indexeddb-storage.ts**: IndexedDB 适配器 (基于 Dexie.js)

#### 查询引擎 (src/query/)
- **query-builder.ts**: 查询构建器
  - 属性查询 (where, orderBy, limit, offset)
  - 空间查询 (intersects, contains, within, distance)

#### 核心类 (src/)
- **webgeodb.ts**: WebGeoDB 主类
  - 数据库管理
  - CRUD 操作
  - 查询接口
  - 空间索引管理

### 测试 (packages/core/test/)
- **webgeodb.test.ts**: 单元测试
  - CRUD 操作测试
  - 查询操作测试
  - 空间操作测试

### 示例 (examples/)
- **basic-usage/**: 基础使用示例
  - 完整的 CRUD 和查询示例
  - 空间查询示例

### 文档 (docs/)
- **getting-started.md**: 快速开始指南
  - 安装说明
  - 基础使用
  - API 示例

### 配置文件
- **package.json**: Monorepo 根配置
- **turbo.json**: Turbo 构建配置
- **tsconfig.json**: TypeScript 配置
- **vitest.config.ts**: 测试配置

## 依赖关系

```
WebGeoDB (核心类)
├── IndexedDBStorage (存储层)
│   └── Dexie.js
├── HybridSpatialIndex (空间索引)
│   ├── RTreeIndex
│   │   └── rbush
│   └── FlatbushIndex
│       └── flatbush
├── QueryBuilder (查询引擎)
│   └── @turf/turf (几何计算)
└── Utils (工具函数)
    ├── bbox (边界框操作)
    └── cache (LRU 缓存)
```

## 代码统计

- TypeScript 文件: 15 个
- 测试文件: 1 个
- 配置文件: 5 个
- 文档文件: 4 个
- 总代码行数: ~2000 行

## 包体积估算

- 核心包 (未压缩): ~300KB
- 依赖包:
  - Dexie.js: ~50KB
  - rbush: ~5KB
  - flatbush: ~2KB
  - @turf/turf: ~100KB
  - wkx: ~20KB
  - proj4: ~50KB
- 总计: ~527KB (接近 500KB 目标)
