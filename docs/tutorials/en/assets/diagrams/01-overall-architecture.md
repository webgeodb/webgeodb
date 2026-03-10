# WebGeoDB Overall Architecture

```mermaid
graph TB
    subgraph "Application Layer"
        APP[User Application]
        API[Query Interface]
    end

    subgraph "Query Engine Layer"
        CHAIN[Chain Query API]
        SQL[SQL-like Query]
        OPT[Query Optimizer]
        EXEC[Query Executor]
    end

    subgraph "Spatial Computing Layer"
        ENGINE[Spatial Engine Registry]
        TURF[Turf.js Engine]
        JSTS[JSTS Engine]
        PRED[Spatial Predicates]
        TOP[Topology Operations]
    end

    subgraph "Index Layer"
        INDEX[Index Manager]
        RTREE[R-Tree Index]
        FLAT[Static Index]
        HYB[Hybrid Index]
    end

    subgraph "Storage Layer"
        CACHE[Geometry Cache]
        DEXIE[Dexie.js Wrapper]
        IDB[IndexedDB]
    end

    subgraph "Plugin System"
        LOADER[Plugin Loader]
        PLUGIN1[Topology Plugin]
        PLUGIN2[3D Plugin]
        PLUGIN3[Temporal Plugin]
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

## Description

This architecture diagram illustrates WebGeoDB's layered structure and modular design:

- **Application Layer**: User application code interacting with the database through query interfaces
- **Query Engine Layer**: Provides both chain query and SQL-like APIs with optimizer and executor
- **Spatial Computing Layer**: Supports multiple spatial engines (Turf.js, JSTS) providing predicates and topology operations
- **Index Layer**: Manages various spatial indexes (R-Tree, Static, Hybrid) for query optimization
- **Storage Layer**: IndexedDB-based persistent storage with geometry caching
- **Plugin System**: Extensible plugin architecture for additional features

## Key Flows

### Query Execution Flow
1. Application initiates query through API
2. Query optimizer selects optimal execution plan
3. Query executor coordinates all layers to complete query
4. Utilizes indexes to accelerate data retrieval
5. Uses cache to reduce redundant computations
6. Results returned to application

### Data Write Flow
1. Application executes insert/update operation
2. Geometry data written to cache
3. Update related indexes
4. Persist to IndexedDB
5. Transaction commit confirmation
