# 空间查询执行流程 / Spatial Query Execution Flow

```mermaid
flowchart TB
    START([空间查询请求 Spatial Query Request]) --> PARSE[解析查询 Parse Query]

    PARSE --> EXTRACT{提取空间条件 Extract Spatial Condition}

    EXTRACT -->|距离查询 Distance| DIST_FLOW[距离查询流程 Distance Flow]
    EXTRACT -->|相交查询 Intersects| INTER_FLOW[相交查询流程 Intersects Flow]
    EXTRACT -->|包含查询 Contains| CONT_FLOW[包含查询流程 Contains Flow]
    EXTRACT -->|在内部查询 Within| WITHIN_FLOW[在内部查询流程 Within Flow]
    EXTRACT -->|其他谓词 Other Predicates| PRED_FLOW[谓词查询流程 Predicate Flow]

    subgraph "距离查询 Distance Query"
        DIST_FLOW --> DIST_CENTER[提取中心点 Extract Center]
        DIST_CENTER --> DIST_RADIUS[提取半径 Extract Radius]
        DIST_RADIUS --> DIST_BBOX[计算查询BBox Calculate Query BBox]
        DIST_BBOX --> DIST_INDEX[索引范围查询 Index Range Query]
        DIST_INDEX --> DIST_CANDIDATES[距离候选集 Distance Candidates]
    end

    subgraph "相交查询 Intersects Query"
        INTER_FLOW --> INTER_GEOM[提取查询几何 Extract Query Geometry]
        INTER_GEOM --> INTER_BBOX[计算几何BBox Calculate Geometry BBox]
        INTER_BBOX --> INTER_INDEX[索引范围查询 Index Range Query]
        INTER_INDEX --> INTER_CANDIDATES[相交候选集 Intersects Candidates]
    end

    subgraph "包含查询 Contains Query"
        CONT_FLOW --> CONT_GEOM[提取容器几何 Extract Container Geometry]
        CONT_GEOM --> CONT_BBOX[计算容器BBox Calculate Container BBox]
        CONT_BBOX --> CONT_INDEX[索引范围查询 Index Range Query]
        CONT_INDEX --> CONT_CANDIDATES[包含候选集 Contains Candidates]
    end

    subgraph "在内部查询 Within Query"
        WITHIN_FLOW --> WITHIN_GEOM[提取边界几何 Extract Boundary Geometry]
        WITHIN_GEOM --> WITHIN_BBOX[计算边界BBox Calculate Boundary BBox]
        WITHIN_BBOX --> WITHIN_INDEX[索引范围查询 Index Range Query]
        WITHIN_INDEX --> WITHIN_CANDIDATES[在内部候选集 Within Candidates]
    end

    subgraph "谓词查询 Predicate Query"
        PRED_FLOW --> PRED_TYPE[识别谓词类型 Identify Predicate Type]
        PRED_TYPE --> PRED_GEOM[提取查询几何 Extract Query Geometry]
        PRED_GEOM --> PRED_BBOX[计算BBox Calculate BBox]
        PRED_BBOX --> PRED_INDEX[索引范围查询 Index Range Query]
        PRED_INDEX --> PRED_CANDIDATES[谓词候选集 Predicate Candidates]
    end

    DIST_CANDIDATES --> MERGE[合并候选集 Merge Candidates]
    INTER_CANDIDATES --> MERGE
    CONT_CANDIDATES --> MERGE
    WITHIN_CANDIDATES --> MERGE
    PRED_CANDIDATES --> MERGE

    MERGE --> LOAD_GEOM[加载几何数据 Load Geometry Data]

    LOAD_GEOM --> CHECK_CACHE{检查缓存 Check Cache}

    CHECK_CACHE -->|命中 Hit| USE_CACHE[使用缓存几何 Use Cached Geometry]
    CHECK_CACHE -->|未命中 Miss| LOAD_FROM_DB[从数据库加载 Load from DB]

    USE_CACHE --> PRECISE_CALC[精确计算 Precise Calculation]
    LOAD_FROM_DB --> FILL_CACHE[填充缓存 Fill Cache]
    FILL_CACHE --> PRECISE_CALC

    PRECISE_CALC --> DIST_CALC[距离计算 Distance Calc]
    PRECISE_CALC --> INTER_CALC[相交计算 Intersects Calc]
    PRECISE_CALC --> CONT_CALC[包含计算 Contains Calc]
    PRECISE_CALC --> WITHIN_CALC[在内部计算 Within Calc]

    DIST_CALC --> FILTER_RESULTS[过滤结果 Filter Results]
    INTER_CALC --> FILTER_RESULTS
    CONT_CALC --> FILTER_RESULTS
    WITHIN_CALC --> FILTER_RESULTS

    FILTER_RESULTS --> APPLY_PROPERTY{应用属性过滤 Apply Property Filter?}

    APPLY_PROPERTY -->|是 Yes| PROP_FILTER[属性条件过滤 Property Filter]
    APPLY_PROPERTY -->|否 No| SORT_RESULTS

    PROP_FILTER --> SORT_RESULTS[排序结果 Sort Results]

    SORT_RESULTS --> APPLY_LIMIT{应用分页 Apply Limit?}

    APPLY_LIMIT -->|是 Yes| LIMIT_RESULTS[限制结果 Limit Results]
    APPLY_LIMIT -->|否 No| FORMAT

    LIMIT_RESULTS --> FORMAT[格式化输出 Format Output]

    FORMAT --> END([返回结果 Return Results])

    style START fill:#e1f5ff
    style END fill:#e8f5e9
    style MERGE fill:#fff4e6
    style PRECISE_CALC fill:#f3e5f5
    style FILTER_RESULTS fill:#fce4ec
```

## 图表说明 Description

### 中文说明

空间查询是WebGeoDB的核心功能，本图展示了空间查询的完整执行流程：

#### 查询类型

1. **距离查询 (Distance)**: 查找指定半径内的地理对象
   - 提取中心点和半径
   - 计算查询边界框
   - 使用索引快速过滤

2. **相交查询 (Intersects)**: 查找与指定几何相交的对象
   - 提取查询几何
   - 计算几何边界框
   - 索引范围查询

3. **包含查询 (Contains)**: 查找完全包含指定几何的对象
   - 提取容器几何
   - 索引和精确验证

4. **在内部查询 (Within)**: 查找完全在指定几何内部的对象
   - 提取边界几何
   - 方向相反的包含判断

#### 执行阶段

1. **索引过滤**: 使用R-Tree索引快速缩小候选集
2. **候选集合并**: 合并多个空间条件的候选集
3. **精确计算**: 对候选集进行精确的几何计算
4. **缓存利用**: 缓存几何对象减少重复加载
5. **结果过滤**: 应用属性条件和排序分页

### English Description

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

## 性能优化要点 Performance Optimization Points

### 1. 索引优先 Index First
```typescript
// ✅ 创建空间索引
await db.features.createIndex('geometry', 'rtree')

// 查询会自动使用索引
const results = await db.features
  .intersects('geometry', queryPolygon)
  .toArray()
```

### 2. BBox预过滤 BBox Pre-filtering
```typescript
// 先用BBox快速过滤
const bbox = turf.bbox(queryPolygon)
const candidates = await db.features
  .where('geometry', 'within', bbox)
  .toArray()

// 再精确计算
const results = candidates.filter(f =>
  turf.intersects(f.geometry, queryPolygon)
)
```

### 3. 批量查询优化 Batch Query Optimization
```typescript
// 批量距离查询
const points = await db.features.toArray()
const distances = await Promise.all(
  points.map(p => db.distance(p.geometry, center))
)
```

### 4. 缓存预热 Cache Warming
```typescript
// 预加载区域数据到缓存
const areaData = await db.features
  .within('geometry', area)
  .toArray()

// 后续查询会更快
```
