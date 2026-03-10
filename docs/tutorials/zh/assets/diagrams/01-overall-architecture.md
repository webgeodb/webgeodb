# WebGeoDB 整体架构 / Overall Architecture

```mermaid
graph TB
    subgraph "应用层 Application Layer"
        APP[用户应用 User Application]
        API[查询接口 Query Interface]
    end

    subgraph "查询引擎层 Query Engine Layer"
        CHAIN[链式查询 API Chain Query API]
        SQL[类SQL查询 SQL-like Query]
        OPT[查询优化器 Query Optimizer]
        EXEC[查询执行器 Query Executor]
    end

    subgraph "空间计算层 Spatial Computing Layer"
        ENGINE[空间引擎注册表 Engine Registry]
        TURF[Turf.js 引擎 Turf Engine]
        JSTS[JSTS 引擎 JSTS Engine]
        PRED[空间谓词 Spatial Predicates]
        TOP[拓扑操作 Topology Operations]
    end

    subgraph "索引层 Index Layer"
        INDEX[索引管理器 Index Manager]
        RTREE[R-Tree 索引 R-Tree Index]
        FLAT[静态索引 Static Index]
        HYB[混合索引 Hybrid Index]
    end

    subgraph "存储层 Storage Layer"
        CACHE[几何缓存 Geometry Cache]
        DEXIE[Dexie.js 封装 Dexie Wrapper]
        IDB[IndexedDB IndexedDB]
    end

    subgraph "插件系统 Plugin System"
        LOADER[插件加载器 Plugin Loader]
        PLUGIN1[拓扑插件 Topology Plugin]
        PLUGIN2[3D插件 3D Plugin]
        PLUGIN3[时态插件 Temporal Plugin]
    end

    APP --> API
    API --> CHAIN
    API --> SQL
    CHAIN --> OPT
    SQL --> OPT
    OPT --> EXEC
    EXEC --> ENGINE
    EXEC --> INDEX
    EXEC --> CACHE

    ENGINE --> TURF
    ENGINE --> JSTS
    TURF --> PRED
    JSTS --> TOP

    INDEX --> RTREE
    INDEX --> FLAT
    INDEX --> HYB

    CACHE --> DEXIE
    EXEC --> DEXIE
    DEXIE --> IDB

    APP --> LOADER
    LOADER --> PLUGIN1
    LOADER --> PLUGIN2
    LOADER --> PLUGIN3

    style APP fill:#e1f5ff
    style API fill:#fff4e6
    style ENGINE fill:#f3e5f5
    style CACHE fill:#e8f5e9
    style IDB fill:#fce4ec
```

## 图表说明 Description

### 中文说明

这个架构图展示了 WebGeoDB 的分层结构和模块化设计：

- **应用层**: 用户的应用代码，通过查询接口与数据库交互
- **查询引擎层**: 提供链式查询和类SQL两种API，包含查询优化器和执行器
- **空间计算层**: 支持多种空间引擎（Turf.js、JSTS），提供空间谓词和拓扑操作
- **索引层**: 管理多种空间索引（R-Tree、静态索引、混合索引）以优化查询性能
- **存储层**: 基于IndexedDB的持久化存储，包含几何缓存机制
- **插件系统**: 支持扩展功能的插件架构

### English Description

This architecture diagram illustrates WebGeoDB's layered structure and modular design:

- **Application Layer**: User application code interacting with the database through query interfaces
- **Query Engine Layer**: Provides both chain query and SQL-like APIs with optimizer and executor
- **Spatial Computing Layer**: Supports multiple spatial engines (Turf.js, JSTS) providing predicates and topology operations
- **Index Layer**: Manages various spatial indexes (R-Tree, Static, Hybrid) for query optimization
- **Storage Layer**: IndexedDB-based persistent storage with geometry caching
- **Plugin System**: Extensible plugin architecture for additional features

## 关键流程 Key Flows

### 查询执行流程 Query Execution Flow
1. 应用通过API发起查询
2. 查询优化器选择最优执行计划
3. 查询执行器协调各层完成查询
4. 利用索引加速数据检索
5. 使用缓存减少重复计算
6. 结果返回给应用

### 数据写入流程 Data Write Flow
1. 应用执行插入/更新操作
2. 几何数据写入缓存
3. 更新相关索引
4. 持久化到IndexedDB
5. 事务提交确认
