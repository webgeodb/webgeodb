# Query Engine Flow

```mermaid
flowchart TB
    START([Query Request]) --> PARSE[Parse Query]

    PARSE --> QUERY_TYPE{Query Type}

    QUERY_TYPE -->|Property Query| PROP_CHAIN[Chain Query Builder]
    QUERY_TYPE -->|Spatial Query| SPATIAL_CHAIN[Spatial Query Builder]
    QUERY_TYPE -->|Combined Query| COMBINE[Query Combiner]

    PROP_CHAIN --> OPTIMIZE[Query Optimizer]
    SPATIAL_CHAIN --> OPTIMIZE
    COMBINE --> OPTIMIZE

    OPTIMIZE --> CHECK_INDEX{Check Index}

    CHECK_INDEX -->|Index Available| USE_INDEX[Use Index]
    CHECK_INDEX -->|No Index| FULL_SCAN[Full Table Scan]

    USE_INDEX --> INDEX_QUERY[Index Query]
    INDEX_QUERY --> CANDIDATES[Candidate Set]

    FULL_SCAN --> CANDIDATES

    CANDIDATES --> CHECK_CACHE{Check Cache}

    CHECK_CACHE -->|Cache Hit| RETURN_CACHE[Return Cached]
    CHECK_CACHE -->|Cache Miss| LOAD_GEOM[Load Geometries]

    LOAD_GEOM --> CACHE_POPULATE[Populate Cache]

    CACHE_POPULATE --> APPLY_PREDICATES[Apply Spatial Predicates]

    APPLY_PREDICATES --> FILTER_RESULTS[Filter Results]

    FILTER_RESULTS --> CHECK_SORT{Need Sort?}

    CHECK_SORT -->|Yes| SORT[Sort Results]
    CHECK_SORT -->|No| CHECK_LIMIT

    SORT --> CHECK_LIMIT{Need Limit?}

    CHECK_LIMIT -->|Yes| LIMIT[Apply Pagination]
    CHECK_LIMIT -->|No| FORMAT

    LIMIT --> FORMAT[Format Results]

    FORMAT --> END([Return Results])

    RETURN_CACHE --> END

    style START fill:#e1f5ff
    style END fill:#e8f5e9
    style OPTIMIZE fill:#fff4e6
    style USE_INDEX fill:#f3e5f5
    style CACHE_POPULATE fill:#fce4ec
```

## Description

The query engine is WebGeoDB's core functional module responsible for processing all query requests and returning results:

#### Query Processing Stages

1. **Query Parsing**: Parse query request, identify query type
   - Property Query: Condition-based queries on property fields
   - Spatial Query: Geometry relation-based spatial queries
   - Combined Query: Combination of property and spatial conditions

2. **Query Optimization**: Analyze query and select optimal execution plan
   - Evaluate available indexes
   - Select optimal index strategy
   - Optimize query order

3. **Index Utilization**: Use spatial indexes to accelerate queries
   - R-Tree Index: Suitable for dynamic data
   - Static Index: Suitable for static data
   - Hybrid Index: Balance performance and flexibility

4. **Cache Management**: Reduce redundant calculations
   - Check if cache hits
   - Populate cache for subsequent use
   - LRU eviction strategy

5. **Predicate Application**: Apply spatial predicates for filtering
   - OGC standard spatial predicates
   - Optimized versions for performance
   - Precise geometric calculations

6. **Result Processing**: Sort, paginate, format
   - Multi-field sort support
   - Flexible pagination mechanism
   - Standardized output format

## Query Optimization Tips

### 1. Use Indexes
```typescript
// Create index
await db.features.createIndex('geometry', 'rtree')

// Query will automatically use index
const results = await db.features
  .distance('geometry', [116.4, 39.9], '<', 1000)
  .toArray()
```

### 2. Use Cache Effectively
```typescript
// Warm up cache
await db.features.loadGeometries(ids)

// Subsequent queries will hit cache
const cached = await db.features.findById(id)
```

### 3. Limit Result Set
```typescript
// Always use limit
const results = await db.features
  .where('type', '=', 'poi')
  .limit(100)  // Limit result count
  .toArray()
```

### 4. Choose Optimal Query Order
```typescript
// Filter before compute
const results = await db.features
  .where('type', '=', 'poi')        // Property filter first
  .where('rating', '>', 4)          // Continue filtering
  .distance('geometry', center, '<', 1000)  // Spatial query last
  .toArray()
```
