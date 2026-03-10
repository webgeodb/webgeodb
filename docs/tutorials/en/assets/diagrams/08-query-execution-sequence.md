# Query Execution Sequence Diagram

```mermaid
sequenceDiagram
    participant App as Application
    participant Query as Query Builder
    participant Opt as Query Optimizer
    participant Index as Index Manager
    participant Cache as Cache System
    participant Storage as Storage Layer
    participant Spatial as Spatial Engine
    participant IDB as IndexedDB

    App->>Query: db.features.where(...).distance(...)
    activate Query
    Query->>Query: Build query conditions
    Query->>Query: Parse spatial conditions
    Query->>Opt: Optimize query
    activate Opt

    Opt->>Opt: Analyze query conditions
    Opt->>Opt: Evaluate available indexes
    Opt->>Index: Check spatial indexes
    activate Index

    alt Index available
        Index-->>Opt: Return index info
        Opt->>Opt: Select optimal index
    else No index available
        Index-->>Opt: No index
        Opt->>Opt: Use full table scan
    end

    deactivate Index
    Opt-->>Query: Return execution plan
    deactivate Opt

    Query->>Index: Execute index query
    activate Index

    alt Using index
        Index->>Index: R-Tree range query
        Index-->>Query: Return candidate set
    else Full table scan
        Index-->>Query: Return all IDs
    end

    deactivate Index

    Query->>Cache: Batch check cache
    activate Cache

    Cache->>Cache: Check LRU cache
    Cache-->>Query: Return cached results

    deactivate Cache

    Query->>Query: Identify uncached data
    Query->>Storage: Load uncached geometries
    activate Storage

    Storage->>IDB: Batch fetch data
    activate IDB
    IDB-->>Storage: Return geometry data
    deactivate IDB

    Storage-->>Query: Return geometry objects
    deactivate Storage

    Query->>Cache: Populate cache
    activate Cache
    Cache->>Cache: Add to LRU cache
    Cache-->>Query: Cache updated
    deactivate Cache

    Query->>Spatial: Apply spatial predicates
    activate Spatial

    alt Precise calculation needed
        Spatial->>Spatial: Turf.js calculation
        Spatial-->>Query: Return precise results
    else BBox filter only
        Spatial-->>Query: Return filtered results
    end

    deactivate Spatial

    Query->>Query: Apply property filters
    Query->>Query: Sort results
    Query->>Query: Apply pagination

    Query-->>App: Return final results
    deactivate Query

    Note over App,IDB: Query completed, results returned
```

## Description

This sequence diagram shows the complete query execution flow in WebGeoDB:

#### Execution Stages

1. **Query Building**
   - Application calls chain query API
   - Build query condition tree
   - Parse spatial and property conditions

2. **Query Optimization**
   - Analyze query conditions
   - Evaluate available indexes
   - Select optimal execution plan

3. **Index Query**
   - Use spatial index for fast filtering
   - Return candidate set IDs
   - Reduce subsequent computation

4. **Cache Handling**
   - Batch check cache
   - Identify uncached data
   - Populate cache for subsequent use

5. **Data Loading**
   - Load complete data from IndexedDB
   - Batch operations reduce IO
   - Update cache

6. **Spatial Calculation**
   - Apply spatial predicates
   - Precise geometry calculation
   - Result filtering

7. **Result Processing**
   - Apply property conditions
   - Sort and pagination
   - Format output

## Query Optimization Examples

### 1. Index Utilization
```typescript
// ✅ Query auto-optimized after creating index
await db.features.createIndex('geometry', 'rtree')

const results = await db.features
  .distance('geometry', [116.4, 39.9], '<', 1000)
  .where('type', '=', 'poi')
  .toArray()
// Automatically uses index + cache
```

### 2. Query Order Optimization
```typescript
// ✅ Filter before compute
const results = await db.features
  .where('type', '=', 'poi')        // Property filter first
  .where('rating', '>', 4)          // Continue filtering
  .distance('geometry', center, '<', 1000)  // Spatial query last
  .toArray()

// ❌ Avoid spatial query first then filter
const results = await db.features
  .distance('geometry', center, '<', 1000)  // Spatial query first
  .where('type', '=', 'poi')                // Filter later
  .toArray()
```

### 3. Batch Query Optimization
```typescript
// ✅ Use batch queries
const ids = ['id1', 'id2', 'id3']
const features = await Promise.all(
  ids.map(id => db.features.findById(id))
)

// ❌ Avoid loop single queries
const features = []
for (const id of ids) {
  const feature = await db.features.findById(id)
  features.push(feature)
}
```

### 4. Cache Warming
```typescript
// ✅ Warm up frequently used data
const hotData = await db.features
  .where('type', '=', 'poi')
  .limit(100)
  .toArray()

// Subsequent queries will hit cache
```
