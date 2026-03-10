# Cache Hit/Miss Flow

```mermaid
flowchart TB
    START([Query Request]) --> CHECK_CACHE{Check Cache}

    CHECK_CACHE -->|Cache Hit| HIT_FLOW[Hit Flow]
    CHECK_CACHE -->|Cache Miss| MISS_FLOW[Miss Flow]

    subgraph "Cache Hit Flow"
        HIT_FLOW --> RETRIEVE[Retrieve from Cache]
        RETRIEVE --> UPDATE_ACCESS[Update Access Time]
        UPDATE_ACCESS --> CACHE_STATS[Update Cache Stats]
        CACHE_STATS --> HIT_SUCCESS([Return Cached])
    end

    subgraph "Cache Miss Flow"
        MISS_FLOW --> CHECK_INDEX{Has Index?}
        CHECK_INDEX -->|Yes| INDEX_QUERY[Index Query]
        CHECK_INDEX -->|No| FULL_SCAN[Full Scan]

        INDEX_QUERY --> CANDIDATES[Candidates]
        FULL_SCAN --> CANDIDATES

        CANDIDATES --> LOAD_DATA[Load Data]
        LOAD_DATA --> CHECK_CAPACITY{Check Cache Capacity}

        CHECK_CAPACITY -->|Not Full| ADD_CACHE[Add to Cache]
        CHECK_CAPACITY -->|Full| EVICTION[Execute Eviction]

        EVICTION --> FIND_LRU[Find LRU Entry]
        FIND_LRU --> REMOVE_OLD[Remove Old Entry]
        REMOVE_OLD --> ADD_CACHE

        ADD_CACHE --> UPDATE_STATS[Update Cache Stats]
        UPDATE_STATS --> MISS_SUCCESS([Return New Data])
    end

    HIT_SUCCESS --> END
    MISS_SUCCESS --> END
    END([End])

    style START fill:#e1f5ff
    style HIT_FLOW fill:#c8e6c9
    style MISS_FLOW fill:#fff4e6
    style HIT_SUCCESS fill:#a5d6a7
    style MISS_SUCCESS fill:#ffe0b2
    style END fill:#e8f5e9
```

## Description

This diagram shows the complete workflow of WebGeoDB cache system, including both cache hit and miss handling logic:

#### Cache Hit Flow

1. **Retrieve Cache**: Quickly get data from LRU cache
2. **Update Access Time**: Update last access time to prevent eviction
3. **Update Statistics**: Increment cache hit count for hit rate calculation
4. **Return Result**: Return cached data directly without database access

**Advantage**: Extremely fast response (microsecond level), reduce database access

#### Cache Miss Flow

1. **Index Query**: Use spatial index to quickly locate candidate data
2. **Data Load**: Load complete data from IndexedDB
3. **Capacity Check**: Check if cache has reached maximum capacity
4. **Direct Add**: If cache not full, directly add new data
5. **LRU Eviction**: If cache full, execute LRU eviction strategy
   - Find least recently used entry
   - Remove that entry
   - Add new data
6. **Update Statistics**: Increment cache miss count

**Advantage**: Automatically manage cache size, retain hot data

## Cache Optimization Tips

### 1. Cache Warming
```typescript
// Warm up cache on app startup
async function warmupCache() {
  const hotData = await db.features
    .where('type', '=', 'poi')
    .limit(100)
    .toArray()

  console.log('Cache warmed with', hotData.length, 'items')
}
```

### 2. Cache Cleanup
```typescript
// Manually clear cache
await db.clearCache()

// Or invalidate specific entry
await db.invalidateCache('feature-id-123')
```

### 3. Cache Size Tuning
```typescript
// Adjust cache size based on memory
const cacheSize = navigator.deviceMemory >= 8 ? 2000 : 500

const db = new WebGeoDB({
  name: 'my-db',
  cache: {
    maxSize: cacheSize  // Dynamic adjustment
  }
})
```

### 4. Monitor Cache Hit Rate
```typescript
// Periodically check cache performance
setInterval(async () => {
  const stats = await db.getCacheStats()
  if (stats.hitRate < 0.7) {
    console.warn('Cache hit rate low:', stats.hitRate)
    // Consider increasing cache size or optimizing queries
  }
}, 60000)  // Check every minute
```
