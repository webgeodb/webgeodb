# 查询执行时序图 / Query Execution Sequence Diagram

```mermaid
sequenceDiagram
    participant App as 应用代码 Application
    participant Query as 查询构建器 Query Builder
    participant Opt as 查询优化器 Query Optimizer
    participant Index as 索引管理器 Index Manager
    participant Cache as 缓存系统 Cache System
    participant Storage as 存储层 Storage Layer
    participant Spatial as 空间引擎 Spatial Engine
    participant IDB as IndexedDB

    App->>Query: db.features.where(...).distance(...)
    activate Query
    Query->>Query: 构建查询条件 Build query conditions
    Query->>Query: 解析空间条件 Parse spatial conditions
    Query->>Opt: 优化查询 Optimize query
    activate Opt

    Opt->>Opt: 分析查询条件 Analyze query conditions
    Opt->>Opt: 评估可用索引 Evaluate available indexes
    Opt->>Index: 检查空间索引 Check spatial indexes
    activate Index

    alt 有可用索引 Index available
        Index-->>Opt: 返回索引信息 Return index info
        Opt->>Opt: 选择最优索引 Select optimal index
    else 无可用索引 No index available
        Index-->>Opt: 无索引 No index
        Opt->>Opt: 使用全表扫描 Use full table scan
    end

    deactivate Index
    Opt-->>Query: 返回执行计划 Return execution plan
    deactivate Opt

    Query->>Index: 执行索引查询 Execute index query
    activate Index

    alt 使用索引 Using index
        Index->>Index: R-Tree范围查询 R-Tree range query
        Index-->>Query: 返回候选集 Return candidate set
    else 全表扫描 Full table scan
        Index-->>Query: 返回全部ID Return all IDs
    end

    deactivate Index

    Query->>Cache: 批量检查缓存 Batch check cache
    activate Cache

    Cache->>Cache: 检查LRU缓存 Check LRU cache
    Cache-->>Query: 返回缓存结果 Return cached results

    deactivate Cache

    Query->>Query: 识别未缓存数据 Identify uncached data
    Query->>Storage: 加载未缓存几何 Load uncached geometries
    activate Storage

    Storage->>IDB: 批量获取数据 Batch fetch data
    activate IDB
    IDB-->>Storage: 返回几何数据 Return geometry data
    deactivate IDB

    Storage-->>Query: 返回几何对象 Return geometry objects
    deactivate Storage

    Query->>Cache: 填充缓存 Populate cache
    activate Cache
    Cache->>Cache: 添加到LRU缓存 Add to LRU cache
    Cache-->>Query: 缓存已更新 Cache updated
    deactivate Cache

    Query->>Spatial: 应用空间谓词 Apply spatial predicates
    activate Spatial

    alt 需要精确计算 Precise calculation needed
        Spatial->>Spatial: Turf.js引擎计算 Turf.js calculation
        Spatial-->>Query: 返回精确结果 Return precise results
    else 只需BBox过滤 BBox filter only
        Spatial-->>Query: 返回过滤结果 Return filtered results
    end

    deactivate Spatial

    Query->>Query: 应用属性过滤 Apply property filters
    Query->>Query: 排序结果 Sort results
    Query->>Query: 应用分页 Apply pagination

    Query-->>App: 返回最终结果 Return final results
    deactivate Query

    Note over App,IDB: 查询完成，结果返回给应用<br>Query completed, results returned
```

## 图表说明 Description

### 中文说明

本时序图展示了 WebGeoDB 查询执行的完整流程：

#### 执行阶段

1. **查询构建**
   - 应用调用链式查询API
   - 构建查询条件树
   - 解析空间和属性条件

2. **查询优化**
   - 分析查询条件
   - 评估可用索引
   - 选择最优执行计划

3. **索引查询**
   - 使用空间索引快速过滤
   - 返回候选集ID
   - 减少后续计算量

4. **缓存处理**
   - 批量检查缓存
   - 识别未命中数据
   - 填充缓存供后续使用

5. **数据加载**
   - 从IndexedDB加载完整数据
   - 批量操作减少IO
   - 更新缓存

6. **空间计算**
   - 应用空间谓词
   - 精确几何计算
   - 结果过滤

7. **结果处理**
   - 应用属性条件
   - 排序和分页
   - 格式化输出

### English Description

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

## 查询优化示例 Query Optimization Examples

### 1. 索引利用 Index Utilization
```typescript
// ✅ 创建索引后查询自动优化
await db.features.createIndex('geometry', 'rtree')

const results = await db.features
  .distance('geometry', [116.4, 39.9], '<', 1000)
  .where('type', '=', 'poi')
  .toArray()
// 自动使用索引 + 缓存
```

### 2. 查询顺序优化 Query Order Optimization
```typescript
// ✅ 先过滤后计算
const results = await db.features
  .where('type', '=', 'poi')        // 先属性过滤
  .where('rating', '>', 4)          // 继续过滤
  .distance('geometry', center, '<', 1000)  // 最后空间查询
  .toArray()

// ❌ 避免先空间查询再过滤
const results = await db.features
  .distance('geometry', center, '<', 1000)  // 先空间查询
  .where('type', '=', 'poi')                // 后过滤
  .toArray()
```

### 3. 批量查询优化 Batch Query Optimization
```typescript
// ✅ 使用批量查询
const ids = ['id1', 'id2', 'id3']
const features = await Promise.all(
  ids.map(id => db.features.findById(id))
)

// ❌ 避免循环单个查询
const features = []
for (const id of ids) {
  const feature = await db.features.findById(id)
  features.push(feature)
}
```

### 4. 缓存预热 Cache Warming
```typescript
// ✅ 预热常用数据
const hotData = await db.features
  .where('type', '=', 'poi')
  .limit(100)
  .toArray()

// 后续查询会命中缓存
```
