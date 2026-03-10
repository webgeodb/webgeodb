# Spatial Query Execution Flow

```mermaid
flowchart TB
    START([Spatial Query Request]) --> PARSE[Parse Query]

    PARSE --> EXTRACT{Extract Spatial Condition}

    EXTRACT -->|Distance| DIST_FLOW[Distance Flow]
    EXTRACT -->|Intersects| INTER_FLOW[Intersects Flow]
    EXTRACT -->|Contains| CONT_FLOW[Contains Flow]
    EXTRACT -->|Within| WITHIN_FLOW[Within Flow]
    EXTRACT -->|Other Predicates| PRED_FLOW[Predicate Flow]

    subgraph "Distance Query"
        DIST_FLOW --> DIST_CENTER[Extract Center]
        DIST_CENTER --> DIST_RADIUS[Extract Radius]
        DIST_RADIUS --> DIST_BBOX[Calculate Query BBox]
        DIST_BBOX --> DIST_INDEX[Index Range Query]
        DIST_INDEX --> DIST_CANDIDATES[Distance Candidates]
    end

    subgraph "Intersects Query"
        INTER_FLOW --> INTER_GEOM[Extract Query Geometry]
        INTER_GEOM --> INTER_BBOX[Calculate Geometry BBox]
        INTER_BBOX --> INTER_INDEX[Index Range Query]
        INTER_INDEX --> INTER_CANDIDATES[Intersects Candidates]
    end

    subgraph "Contains Query"
        CONT_FLOW --> CONT_GEOM[Extract Container Geometry]
        CONT_GEOM --> CONT_BBOX[Calculate Container BBox]
        CONT_BBOX --> CONT_INDEX[Index Range Query]
        CONT_INDEX --> CONT_CANDIDATES[Contains Candidates]
    end

    subgraph "Within Query"
        WITHIN_FLOW --> WITHIN_GEOM[Extract Boundary Geometry]
        WITHIN_GEOM --> WITHIN_BBOX[Calculate Boundary BBox]
        WITHIN_BBOX --> WITHIN_INDEX[Index Range Query]
        WITHIN_INDEX --> WITHIN_CANDIDATES[Within Candidates]
    end

    subgraph "Predicate Query"
        PRED_FLOW --> PRED_TYPE[Identify Predicate Type]
        PRED_TYPE --> PRED_GEOM[Extract Query Geometry]
        PRED_GEOM --> PRED_BBOX[Calculate BBox]
        PRED_BBOX --> PRED_INDEX[Index Range Query]
        PRED_INDEX --> PRED_CANDIDATES[Predicate Candidates]
    end

    DIST_CANDIDATES --> MERGE[Merge Candidates]
    INTER_CANDIDATES --> MERGE
    CONT_CANDIDATES --> MERGE
    WITHIN_CANDIDATES --> MERGE
    PRED_CANDIDATES --> MERGE

    MERGE --> LOAD_GEOM[Load Geometry Data]

    LOAD_GEOM --> CHECK_CACHE{Check Cache}

    CHECK_CACHE -->|Hit| USE_CACHE[Use Cached Geometry]
    CHECK_CACHE -->|Miss| LOAD_FROM_DB[Load from DB]

    USE_CACHE --> PRECISE_CALC[Precise Calculation]
    LOAD_FROM_DB --> FILL_CACHE[Fill Cache]
    FILL_CACHE --> PRECISE_CALC

    PRECISE_CALC --> DIST_CALC[Distance Calc]
    PRECISE_CALC --> INTER_CALC[Intersects Calc]
    PRECISE_CALC --> CONT_CALC[Contains Calc]
    PRECISE_CALC --> WITHIN_CALC[Within Calc]

    DIST_CALC --> FILTER_RESULTS[Filter Results]
    INTER_CALC --> FILTER_RESULTS
    CONT_CALC --> FILTER_RESULTS
    WITHIN_CALC --> FILTER_RESULTS

    FILTER_RESULTS --> APPLY_PROPERTY{Apply Property Filter?}

    APPLY_PROPERTY -->|Yes| PROP_FILTER[Property Filter]
    APPLY_PROPERTY -->|No| SORT_RESULTS

    PROP_FILTER --> SORT_RESULTS[Sort Results]

    SORT_RESULTS --> APPLY_LIMIT{Apply Limit?}

    APPLY_LIMIT -->|Yes| LIMIT_RESULTS[Limit Results]
    APPLY_LIMIT -->|No| FORMAT

    LIMIT_RESULTS --> FORMAT[Format Output]

    FORMAT --> END([Return Results])

    style START fill:#e1f5ff
    style END fill:#e8f5e9
    style MERGE fill:#fff4e6
    style PRECISE_CALC fill:#f3e5f5
    style FILTER_RESULTS fill:#fce4ec
```

## Description

Spatial query is the core function of WebGeoDB. This diagram shows the complete execution flow of spatial queries:

#### Query Types

1. **Distance Query**: Find geographic objects within specified radius
   - Extract center point and radius
   - Calculate query bounding box
   - Use index for fast filtering

2. **Intersects Query**: Find objects intersecting with specified geometry
   - Extract query geometry
   - Calculate geometry bounding box
   - Index range query

3. **Contains Query**: Find objects completely containing specified geometry
   - Extract container geometry
   - Index and precise verification

4. **Within Query**: Find objects completely within specified geometry
   - Extract boundary geometry
   - Reverse direction of contains judgment

#### Execution Stages

1. **Index Filter**: Use R-Tree index to quickly narrow candidate set
2. **Candidate Merge**: Merge candidate sets from multiple spatial conditions
3. **Precise Calculation**: Perform precise geometry calculations on candidate set
4. **Cache Utilization**: Cache geometry objects to reduce redundant loading
5. **Result Filter**: Apply property conditions and sorting pagination

## Performance Optimization Points

### 1. Index First
```typescript
// ✅ Create spatial index
await db.features.createIndex('geometry', 'rtree')

// Query will automatically use index
const results = await db.features
  .intersects('geometry', queryPolygon)
  .toArray()
```

### 2. BBox Pre-filtering
```typescript
// First use BBox for fast filtering
const bbox = turf.bbox(queryPolygon)
const candidates = await db.features
  .where('geometry', 'within', bbox)
  .toArray()

// Then precise calculation
const results = candidates.filter(f =>
  turf.intersects(f.geometry, queryPolygon)
)
```

### 3. Batch Query Optimization
```typescript
// Batch distance queries
const points = await db.features.toArray()
const distances = await Promise.all(
  points.map(p => db.distance(p.geometry, center))
)
```

### 4. Cache Warming
```typescript
// Pre-load area data to cache
const areaData = await db.features
  .within('geometry', area)
  .toArray()

// Subsequent queries will be faster
```
