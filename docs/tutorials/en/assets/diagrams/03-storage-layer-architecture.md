# Storage Layer Architecture

```mermaid
graph TB
    subgraph "Data Access Layer"
        DAO[Data Access Object]
        CRUD["CRUD Interface:
- insert(data)
- update(id, data)
- delete(id)
- findById(id)
- findAll()"]
    end

    subgraph "Dexie.js Wrapper Layer"
        DEXIE[DexieStorage]
        SCHEMA[Schema Definition]
        TABLES["Table Definitions:
- features
- indexes
- metadata"]
        TRANS[Transaction Support]
    end

    subgraph "IndexedDB Native Layer"
        IDB[IndexedDB Database]
        STORES["Object Stores:
- features store
- indexes store
- metadata store"]
        INDEXES["Native Indexes:
- ID index
- Property indexes
- Compound indexes"]
    end

    subgraph "Geometry Cache System"
        CACHE[GeometryCache]
        LRU[LRU Cache]
        POLICY["Cache Policy:
- Max 1000 items
- TTL 30min
- LRU eviction"]
        STATS["Cache Statistics:
- Hit rate monitoring
- Hot data tracking"]
    end

    subgraph "Index Management Layer"
        INDEX_MGR[IndexManager]
        RTREE[R-Tree Index Manager]
        FLAT[Flatbush Index Manager]
        HYBRID[Hybrid Index Manager]
        AUTO["Auto Maintenance:
- Update on insert
- Rebuild on update
- Clean on delete"]
    end

    subgraph "Persistence Strategy"
        PERSIST[Persistence Manager]
        BATCH[Batch Operations]
        QUEUE["Write Queue:
- Batch write optimization
- Deduplication"]
        FLUSH["Flush Strategy:
- Periodic flush
- Queue full flush
- Manual flush"]
    end

    DAO --> DEXIE
    DEXIE --> SCHEMA
    DEXIE --> TABLES
    DEXIE --> TRANS
    DEXIE --> IDB

    IDB --> STORES
    IDB --> INDEXES

    DAO --> CACHE
    CACHE --> LRU
    CACHE --> POLICY
    CACHE --> STATS

    DAO --> INDEX_MGR
    INDEX_MGR --> RTREE
    INDEX_MGR --> FLAT
    INDEX_MGR --> HYBRID
    INDEX_MGR --> AUTO

    DAO --> PERSIST
    PERSIST --> BATCH
    PERSIST --> QUEUE
    PERSIST --> FLUSH

    style DAO fill:#e1f5ff
    style DEXIE fill:#fff4e6
    style CACHE fill:#e8f5e9
    style IDB fill:#fce4ec
    style INDEX_MGR fill:#f3e5f5
```

## Description

The storage layer is WebGeoDB's data persistence foundation, designed with layers for performance and reliability:

- **Data Access Layer**: Provides unified CRUD interface encapsulating all data access logic
- **Dexie.js Wrapper Layer**: Wraps IndexedDB with Dexie.js providing friendly API and transaction support
- **IndexedDB Native Layer**: Browser native storage engine providing persistence capability
- **Geometry Cache System**: LRU cache strategy caching frequently used geometries reducing IndexedDB access
- **Index Management Layer**: Manages creation, update, and deletion of spatial indexes maintaining consistency
- **Persistence Strategy**: Batch write, queue management, flush strategy optimizing write performance

## Data Write Flow

### Insert Operation
```typescript
// 1. Application calls insert
await db.features.insert(feature)

// 2. Write to geometry cache
cache.set(id, geometry)

// 3. Update spatial index
indexManager.insert(id, bbox)

// 4. Persist to IndexedDB
await dexie.table('features').add(feature)

// 5. Commit transaction
transaction.commit()
```

### Update Operation
```typescript
// 1. Application calls update
await db.features.update(id, newData)

// 2. Update geometry cache
cache.update(id, newGeometry)

// 3. Rebuild spatial index
indexManager.update(id, oldBbox, newBbox)

// 4. Persist to IndexedDB
await dexie.table('features').put(id, newData)

// 5. Commit transaction
transaction.commit()
```

## Query Optimization Strategy

1. **Cache First**: Prioritize reading from cache
2. **Index Acceleration**: Use spatial indexes to quickly locate candidate sets
3. **Batch Prefetch**: Prefetch related data reducing IO operations
4. **Lazy Loading**: Load large objects on demand
5. **Result Set Caching**: Cache query results reducing redundant calculations
