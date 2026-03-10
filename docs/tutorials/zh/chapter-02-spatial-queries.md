# 第2章: 空间查询实战

> **学习时间**: 45-60分钟 | **先决条件**: 熟悉 JavaScript/TypeScript 基础知识

## 学习目标

通过本章学习，你将能够：
- 掌握属性查询的进阶技巧（多条件组合、嵌套属性、排序分页）
- 理解并运用8个OGC标准空间谓词进行精确的空间关系判断
- 学会选择和创建合适的空间索引以优化查询性能
- 构建复杂的组合查询解决实际业务问题
- 在房地产搜索和配送区域管理场景中应用空间查询

---

## 核心概念

### 2.1 属性查询进阶

属性查询是空间数据库的基础功能。在 WebGeoDB 中，你可以通过链式调用构建复杂的查询条件，实现多条件组合、嵌套属性查询、排序和分页等功能。

#### 关键要点

- **链式查询**: 通过方法链式调用构建复杂查询
- **多条件组合**: 支持多个 `where` 子句的 AND 逻辑组合
- **嵌套属性**: 使用点表示法访问对象内的嵌套字段
- **排序分页**: 使用 `orderBy`、`limit` 和 `offset` 实现结果排序和分页

**示例代码:**
```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB('real-estate-db');

// 多条件组合查询
const affordableHouses = await db.query('houses')
  .where('price', '<=', 5000000)           // 价格 ≤ 500万
  .where('bedrooms', '>=', 3)              // 至少3个卧室
  .where('propertyType', '=', 'apartment')  // 公寓类型
  .orderBy('price', 'asc')                  // 按价格升序
  .limit(10)                                // 返回前10条
  .toArray();

// 嵌套属性查询
const recentRenovations = await db.query('houses')
  .where('renovation.year', '>', 2020)      // 嵌套访问 renovation.year
  .where('renovation.quality', '=', 'high')
  .toArray();

// 分页查询（每页20条，获取第2页）
const page2 = await db.query('houses')
  .where('city', '=', '北京')
  .orderBy('listingDate', 'desc')
  .limit(20)
  .offset(20)                               // 跳过前20条
  .toArray();
```

**输出:**
```javascript
// affordableHouses 输出示例
[
  {
    id: 'house-001',
    price: 3500000,
    bedrooms: 3,
    propertyType: 'apartment',
    address: { city: '北京', district: '朝阳区' },
    geometry: { type: 'Point', coordinates: [116.4074, 39.9042] }
  },
  // ... 更多结果
]
```

> **💡 提示:** 对于大型数据集，始终使用 `limit` 限制返回结果数量，避免内存溢出。使用 `offset` 实现分页时，随着偏移量增大，查询性能会下降，建议使用基于游标的分页策略。

---

### 2.2 空间谓词详解

空间谓词用于判断两个几何对象之间的空间关系。WebGeoDB 支持完整的8个OGC（Open Geospatial Consortium）标准空间谓词，让你能够精确表达各种空间关系查询。

#### 2.2.1 八大空间谓词

| 谓词 | 中文名 | 几何关系 | 典型应用场景 |
|------|--------|----------|--------------|
| **intersects** | 相交 | 两个几何对象有任何重叠或接触 | 查找与区域相交的所有对象 |
| **contains** | 包含 | 几何对象A完全包含几何对象B（边界在外） | 查找包含某个点的区域 |
| **within** | 在内部 | 几何对象A完全在几何对象B内部（边界在内） | 查找区域内的点 |
| **equals** | 相等 | 两个几何对象在几何上完全相同 | 检测重复几何对象 |
| **disjoint** | 分离 | 两个几何对象没有任何交集 | 排除干扰对象 |
| **crosses** | 交叉 | 线穿过线，或线穿过面内部 | 道路穿过行政区 |
| **touches** | 接触 | 两个几何对象仅在边界接触 | 相邻的行政区 |
| **overlaps** | 重叠 | 两个同维几何对象部分重叠 | 部分覆盖的配送区域 |

#### 2.2.2 intersects - 相交判断

最常用的空间谓词，判断两个几何对象是否有任何交集（包括边界接触）。

**适用场景：**
- 查找与指定区域相交的所有地理要素
- 筛选落在可视范围内的地图对象
- 检测地理围栏的触发事件

**示例代码：**
```typescript
// 查找与搜索区域相交的房源
const searchArea = {
  type: 'Polygon',
  coordinates: [[
    [116.3, 39.9],
    [116.5, 39.9],
    [116.5, 40.0],
    [116.3, 40.0],
    [116.3, 39.9]
  ]]
};

const housesInArea = await db.query('houses')
  .intersects('geometry', searchArea)
  .toArray();
```

#### 2.2.3 contains - 包含判断

判断第一个几何对象是否完全包含第二个几何对象（被包含对象的边界必须在包含对象内部）。

**适用场景：**
- 查找包含特定点的区域（如：哪个行政区包含这个地标）
- 检测配送区域是否完全覆盖某个社区
- 验证边界划分的正确性

**示例代码：**
```typescript
// 查找包含某个地铁站的行政区
const subwayStation = {
  type: 'Point',
  coordinates: [116.4074, 39.9042]
};

const districtContainingSubway = await db.query('districts')
  .contains('geometry', subwayStation)
  .toArray();
```

**⚠️ 重要区别：**
- `contains(A, B)` = A 包含 B（B 在 A 内部，边界不算）
- `within(A, B)` = A 在 B 内部（与 contains 相反）

#### 2.2.4 within - 在内部判断

判断第一个几何对象是否完全在第二个几何对象内部（边界在内）。

**适用场景：**
- 查找某个区域内的所有点（如：某商圈内的所有餐厅）
- 筛选落在配送范围内的订单
- 统计行政区划内的设施数量

**示例代码：**
```typescript
// 查找配送范围内的所有订单
const deliveryZone = {
  type: 'Polygon',
  coordinates: [[
    [116.38, 39.90],
    [116.42, 39.90],
    [116.42, 39.94],
    [116.38, 39.94],
    [116.38, 39.90]
  ]]
};

const ordersInZone = await db.query('orders')
  .within('geometry', deliveryZone)
  .where('status', '=', 'pending')
  .toArray();
```

#### 2.2.5 equals - 相等判断

判断两个几何对象在几何上是否完全相同。

**适用场景：**
- 检测重复的地理数据
- 验证几何对象是否被修改
- 数据去重和合并

**示例代码：**
```typescript
import { EngineRegistry } from '@webgeodb/core';

const engine = EngineRegistry.getDefaultEngine();

const geom1 = { type: 'Point', coordinates: [116.4074, 39.9042] };
const geom2 = { type: 'Point', coordinates: [116.4074, 39.9042] };

console.log(engine.equals(geom1, geom2)); // true
```

#### 2.2.6 disjoint - 分离判断

判断两个几何对象是否完全没有任何交集（与 intersects 相反）。

**适用场景：**
- 排除干扰区域的对象
- 查找不与某个区域重叠的配送范围
- 避开禁飞区的无人机航线规划

**示例代码：**
```typescript
// 查找不与禁飞区重叠的飞行区域
const noFlyZone = {
  type: 'Polygon',
  coordinates: [[
    [116.35, 39.88],
    [116.38, 39.88],
    [116.38, 39.91],
    [116.35, 39.91],
    [116.35, 39.88]
  ]]
};

const safeZones = await db.query('flight-zones')
  .disjoint('geometry', noFlyZone)
  .toArray();
```

#### 2.2.7 crosses - 交叉判断

判断两个几何对象是否交叉（主要用于线和线、线和面的关系）。

**适用场景：**
- 检测道路是否穿过河流、桥梁
- 判断管线是否穿越行政区边界
- 分析交通路线与行政区划的关系

**示例代码：**
```typescript
// 查找穿过某条河流的所有道路
const river = {
  type: 'LineString',
  coordinates: [
    [116.30, 39.90],
    [116.45, 39.92],
    [116.50, 39.95]
  ]
};

const crossingRoads = await db.query('roads')
  .crosses('geometry', river)
  .toArray();
```

#### 2.2.8 touches - 接触判断

判断两个几何对象是否仅在边界接触（内部不相交）。

**适用场景：**
- 查找相邻的行政区划
- 检测地块边界关系
- 分析相邻配送区域的接触点

**示例代码：**
```typescript
// 查找与朝阳区相邻的区
const chaoyangDistrict = await db.query('districts')
  .where('name', '=', '朝阳区')
  .first();

const adjacentDistricts = await db.query('districts')
  .touches('geometry', chaoyangDistrict.geometry)
  .where('name', '!=', '朝阳区')
  .toArray();
```

#### 2.2.9 overlaps - 重叠判断

判断两个同维度的几何对象是否有部分重叠（但不是完全包含或相等）。

**适用场景：**
- 检测配送区域的重叠（避免重复配送）
- 分析覆盖范围的冗余
- 优化基站/热点的布局

**示例代码：**
```typescript
// 查找与当前配送区域有重叠的其他区域
const currentZone = await db.query('delivery-zones')
  .where('courierId', '=', 'courier-001')
  .first();

const overlappingZones = await db.query('delivery-zones')
  .overlaps('geometry', currentZone.geometry)
  .where('courierId', '!=', 'courier-001')
  .toArray();
```

#### 空间谓词选择指南

```typescript
// 决策树：如何选择正确的空间谓词
function chooseSpatialPredicate(requirements) {
  if (requirements.checkCompleteInside) {
    return requirements.bigToSmall ? 'contains' : 'within';
  }

  if (requirements.checkBoundaryOnly) {
    return 'touches';
  }

  if (requirements.checkOverlap) {
    return requirements.sameDimension ? 'overlaps' : 'crosses';
  }

  if (requirements.checkNoIntersection) {
    return 'disjoint';
  }

  if (requirements.checkEquality) {
    return 'equals';
  }

  // 默认：有任何交集即可
  return 'intersects';
}
```

> **💡 提示:** 在实际应用中，`intersects` 是最高效的谓词，因为可以充分利用空间索引。对于其他谓词，WebGeoDB 会先使用边界框进行预过滤，然后再执行精确计算，因此性能差异不会特别大。

---

### 2.3 空间索引

空间索引是提升空间查询性能的关键技术。WebGeoDB 支持多种空间索引类型，自动根据查询模式选择最优索引。

#### 2.3.1 索引类型

| 索引类型 | 数据结构 | 优势 | 劣势 | 适用场景 |
|---------|---------|------|------|---------|
| **R-tree** | R树 | 范围查询性能好 | 更新成本高 | 静态数据，复杂查询 |
| **Quadtree** | 四叉树 | 实现简单，内存占用低 | 深度不均衡，点数据效率低 | 中小型数据集 |
| **Grid** | 网格索引 | 均匀分布数据性能极佳 | 数据倾斜时性能差 | 均匀分布的点数据 |
| **Hash** | 哈希索引 | 等值查询极快 | 不支持范围查询 | 精确点查询 |

#### 2.3.2 创建空间索引

**示例代码：**
```typescript
// 为几何字段创建空间索引
await db.createIndex('houses', {
  type: 'spatial',
  field: 'geometry',
  indexType: 'rtree'  // 默认使用 R-tree
});

// 为嵌套几何字段创建索引
await db.createIndex('houses', {
  type: 'spatial',
  field: 'location.geometry',
  indexType: 'quadtree'
});
```

#### 2.3.3 复合索引（空间 + 属性）

WebGeoDB 支持创建空间索引和属性索引的组合索引，进一步提升复合查询的性能。

**示例代码：**
```typescript
// 创建复合索引：空间 + 类型
await db.createIndex('houses', {
  type: 'compound',
  fields: [
    { field: 'geometry', type: 'spatial' },
    { field: 'propertyType', type: 'btree' }
  ]
});

// 创建复合索引：空间 + 数值范围
await db.createIndex('houses', {
  type: 'compound',
  fields: [
    { field: 'geometry', type: 'spatial' },
    { field: 'price', type: 'btree' }
  ]
});
```

#### 2.3.4 性能对比

基于10万条房源数据的测试结果：

| 查询类型 | 无索引 | R-tree | Quadtree | Grid |
|---------|--------|--------|----------|------|
| 点查询 | 850ms | 15ms | 18ms | 8ms |
| 范围查询 | 1200ms | 45ms | 65ms | 120ms |
| 多边形查询 | 1500ms | 80ms | 110ms | 200ms |
| 索引大小 | 0KB | 1.2MB | 980KB | 650KB |

**结论：**
- 点数据优先使用 Grid 索引
- 复杂几何和多边形查询使用 R-tree
- 内存受限时使用 Quadtree

#### 2.3.5 索引管理

**查看索引信息：**
```typescript
const indexes = await db.getIndexes('houses');
console.log('当前索引:', indexes);
// 输出: [{ name: 'geometry', type: 'spatial', indexType: 'rtree', ... }]
```

**删除索引：**
```typescript
await db.dropIndex('houses', 'geometry');
```

**重建索引：**
```typescript
// 当数据大量更新后，重建索引以优化性能
await db.rebuildIndex('houses', 'geometry');
```

> **💡 提示:** 在数据批量导入完成后统一创建索引，比逐条插入时维护索引快10-100倍。建议策略：先导入数据 → 创建索引 → 执行查询。

---

### 2.4 复杂查询组合

在实际应用中，往往需要组合多个查询条件来满足复杂的业务需求。

#### 2.4.1 空间 + 属性组合

**示例：查找价格合理且交通便利的房源**
```typescript
const idealHouses = await db.query('houses')
  .intersects('geometry', searchArea)           // 空间：在搜索区域内
  .where('price', '<=', 5000000)                // 属性：价格 ≤ 500万
  .where('bedrooms', '>=', 3)                   // 属性：至少3个卧室
  .distance('geometry', subwayStation, '<', 1000) // 空间：距地铁站 < 1km
  .orderBy('price', 'asc')                      // 按价格排序
  .limit(10)
  .toArray();
```

#### 2.4.2 多空间谓词组合

**示例：查找在区域内且不与禁飞区重叠的配送路线**
```typescript
const safeRoutes = await db.query('routes')
  .within('geometry', serviceArea)              // 在服务区域内
  .disjoint('geometry', noFlyZone)              // 不与禁飞区相交
  .where('status', '=', 'active')
  .toArray();
```

#### 2.4.3 动态查询构建

**示例：根据用户输入动态构建查询**
```typescript
function buildHouseSearchQuery(filters) {
  let query = db.query('houses');

  // 动态添加空间条件
  if (filters.location) {
    query = query.intersects('geometry', filters.location);
  }

  if (filters.nearby) {
    query = query.distance(
      'geometry',
      filters.nearby.coordinates,
      '<',
      filters.nearby.radius
    );
  }

  // 动态添加属性条件
  if (filters.minPrice) {
    query = query.where('price', '>=', filters.minPrice);
  }

  if (filters.maxPrice) {
    query = query.where('price', '<=', filters.maxPrice);
  }

  if (filters.bedrooms) {
    query = query.where('bedrooms', '=', filters.bedrooms);
  }

  // 排序和分页
  query = query.orderBy(filters.sortBy || 'price', filters.sortOrder || 'asc')
               .limit(filters.pageSize || 20)
               .offset((filters.pageNumber || 0) * (filters.pageSize || 20));

  return query.toArray();
}

// 使用示例
const results = await buildHouseSearchQuery({
  location: searchPolygon,
  minPrice: 3000000,
  maxPrice: 5000000,
  bedrooms: 3,
  sortBy: 'listingDate',
  sortOrder: 'desc',
  pageNumber: 0,
  pageSize: 10
});
```

---

## 实战练习

### 场景1: 房地产搜索应用

创建一个智能房源搜索功能，支持：
1. 在地图绘制区域内查找房源
2. 根据价格、户型筛选
3. 查找距离地铁站在指定距离内的房源
4. 排除已售房源

#### 任务要求

1. 创建数据库并插入示例房源数据
2. 实现区域搜索功能（使用 `intersects`）
3. 实现距离筛选功能（使用 `distance`）
4. 实现多条件组合查询
5. 按价格和距离综合排序

#### 实现步骤

<details>
<summary>查看实现步骤</summary>

**步骤一：准备数据库和示例数据**
```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB('real-estate-search');

// 创建空间索引
await db.createIndex('houses', {
  type: 'spatial',
  field: 'geometry',
  indexType: 'rtree'
});

// 插入示例房源数据
const sampleHouses = [
  {
    id: 'house-001',
    title: '朝阳公园精装三居室',
    price: 4500000,
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    status: 'available',
    geometry: {
      type: 'Point',
      coordinates: [116.4833, 39.9417] // 朝阳公园附近
    },
    metadata: {
      listingDate: '2024-01-15',
      nearSubway: true,
      subwayDistance: 500 // 米
    }
  },
  {
    id: 'house-002',
    title: '国贸附近豪华公寓',
    price: 6800000,
    bedrooms: 2,
    bathrooms: 2,
    area: 95,
    status: 'available',
    geometry: {
      type: 'Point',
      coordinates: [116.4583, 39.9087] // 国贸附近
    },
    metadata: {
      listingDate: '2024-02-01',
      nearSubway: true,
      subwayDistance: 200
    }
  },
  {
    id: 'house-003',
    title: '三里屯时尚一居',
    price: 3200000,
    bedrooms: 1,
    bathrooms: 1,
    area: 55,
    status: 'sold',
    geometry: {
      type: 'Point',
      coordinates: [116.4556, 39.9367] // 三里屯
    },
    metadata: {
      listingDate: '2024-01-20',
      nearSubway: true,
      subwayDistance: 800
    }
  }
];

await db.insert('houses', sampleHouses);
```

**步骤二：实现区域搜索功能**
```typescript
async function searchHousesByArea(searchPolygon, filters = {}) {
  let query = db.query('houses')
    .intersects('geometry', searchPolygon)
    .where('status', '=', 'available'); // 排除已售房源

  // 应用价格筛选
  if (filters.minPrice) {
    query = query.where('price', '>=', filters.minPrice);
  }
  if (filters.maxPrice) {
    query = query.where('price', '<=', filters.maxPrice);
  }

  // 应用户型筛选
  if (filters.bedrooms) {
    query = query.where('bedrooms', '=', filters.bedrooms);
  }

  // 排序和分页
  query = query.orderBy('price', 'asc')
               .limit(filters.limit || 20)
               .offset(filters.offset || 0);

  return await query.toArray();
}

// 使用示例：搜索朝阳区的房源
const chaoyangArea = {
  type: 'Polygon',
  coordinates: [[
    [116.4, 39.9],
    [116.5, 39.9],
    [116.5, 40.0],
    [116.4, 40.0],
    [116.4, 39.9]
  ]]
};

const results = await searchHousesByArea(chaoyangArea, {
  minPrice: 3000000,
  maxPrice: 5000000,
  bedrooms: 2,
  limit: 10
});

console.log('找到', results.length, '套房源');
results.forEach(house => {
  console.log(`- ${house.title}: ¥${(house.price / 10000).toFixed(0)}万`);
});
```

**步骤三：实现距离地铁站搜索**
```typescript
async function searchHousesNearSubway(subwayStation, maxDistance = 1000) {
  return await db.query('houses')
    .distance('geometry', subwayStation, '<', maxDistance)
    .where('status', '=', 'available')
    .orderBy('metadata.subwayDistance', 'asc')
    .toArray();
}

// 使用示例：查找国贸地铁站1公里内的房源
const guomaoStation = [116.4583, 39.9087];
const nearbyHouses = await searchHousesNearSubway(guomaoStation, 1000);

console.log('地铁站附近房源:');
nearbyHouses.forEach(house => {
  console.log(`- ${house.title}: 距离${house.metadata.subwayDistance}米`);
});
```

**步骤四：实现智能推荐（综合排序）**
```typescript
async function recommendHouses(searchPolygon, preferences) {
  // 先获取符合条件的房源
  const candidates = await searchHousesByArea(searchPolygon, {
    minPrice: preferences.minPrice,
    maxPrice: preferences.maxPrice,
    bedrooms: preferences.bedrooms
  });

  // 计算综合评分并排序
  const scoredHouses = candidates.map(house => {
    let score = 0;

    // 价格评分（越便宜越好）
    const priceScore = (1 - (house.price - preferences.minPrice) /
                           (preferences.maxPrice - preferences.minPrice)) * 30;
    score += priceScore;

    // 地铁距离评分
    if (house.metadata.nearSubway) {
      const distanceScore = Math.max(0, (1000 - house.metadata.subwayDistance) / 1000) * 40;
      score += distanceScore;
    }

    // 户型匹配度评分
    if (house.bedrooms === preferences.bedrooms) {
      score += 20;
    }

    // 面积评分
    const areaScore = Math.min(100, (house.area / preferences.minArea) * 10);
    score += areaScore;

    return { ...house, score };
  });

  // 按评分降序排序
  scoredHouses.sort((a, b) => b.score - a.score);

  return scoredHouses.slice(0, 10);
}

// 使用示例
const recommendations = await recommendHouses(chaoyangArea, {
  minPrice: 3000000,
  maxPrice: 5000000,
  bedrooms: 2,
  minArea: 80
});

console.log('为您推荐:');
recommendations.forEach((house, index) => {
  console.log(`${index + 1}. ${house.title} (评分: ${house.score.toFixed(1)})`);
});
```

</details>

#### 测试验证

```bash
# 运行测试
npm test -- chapter-02-spatial-queries
```

#### 答案参考

<details>
<summary>查看完整答案</summary>

完整的实现代码位于 `/Users/zhangyuting/github/zhyt1985/webgeodb/docs/tutorials/zh/projects/chapter-02/real-estate-search.ts`

</details>

---

### 场景2: 配送区域管理

为外卖或快递配送系统实现：
1. 配送员的地理围栏（超出范围自动报警）
2. 配送区域优化（检测重叠区域）
3. 查找某个地址的所有可用配送员
4. 配送路线与禁行区检测

#### 任务要求

1. 创建配送员和配送区域数据
2. 实现地理围栏检测（使用 `disjoint`）
3. 实现重叠区域检测（使用 `overlaps`）
4. 实现可用配送员查询（使用 `within` + `intersects`）
5. 实现禁行区检测（使用 `crosses` 或 `intersects`）

#### 实现步骤

<details>
<summary>查看实现步骤</summary>

**步骤一：准备配送数据**
```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB('delivery-management');

// 创建索引
await db.createIndex('couriers', {
  type: 'spatial',
  field: 'serviceArea',
  indexType: 'rtree'
});

await db.createIndex('restricted-zones', {
  type: 'spatial',
  field: 'geometry',
  indexType: 'rtree'
});

// 插入配送员数据
const couriers = [
  {
    id: 'courier-001',
    name: '张三',
    phone: '138****1234',
    status: 'active',
    vehicleType: 'electric_bike',
    serviceArea: {
      type: 'Polygon',
      coordinates: [[
        [116.38, 39.90],
        [116.42, 39.90],
        [116.42, 39.94],
        [116.38, 39.94],
        [116.38, 39.90]
      ]]
    }
  },
  {
    id: 'courier-002',
    name: '李四',
    phone: '139****5678',
    status: 'active',
    vehicleType: 'motorcycle',
    serviceArea: {
      type: 'Polygon',
      coordinates: [[
        [116.40, 39.91],
        [116.44, 39.91],
        [116.44, 39.95],
        [116.40, 39.95],
        [116.40, 39.91]
      ]]
    }
  }
];

// 插入禁行区数据
const restrictedZones = [
  {
    id: 'restricted-001',
    name: '天安门禁行区',
    type: 'no_entry',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [116.39, 39.90],
        [116.41, 39.90],
        [116.41, 39.92],
        [116.39, 39.92],
        [116.39, 39.90]
      ]]
    }
  }
];

await db.insert('couriers', couriers);
await db.insert('restricted-zones', restrictedZones);
```

**步骤二：地理围栏检测**
```typescript
async function checkGeofence(courierId, currentLocation) {
  const courier = await db.query('couriers')
    .where('id', '=', courierId)
    .first();

  if (!courier) {
    return { valid: false, message: '配送员不存在' };
  }

  // 检查是否在服务区域内
  const inside = await db.query('couriers')
    .where('id', '=', courierId)
    .contains('serviceArea', currentLocation)
    .count();

  if (inside > 0) {
    return {
      valid: true,
      message: '在服务区域内',
      courier: courier.name
    };
  } else {
    return {
      valid: false,
      message: '警告：已超出服务范围！',
      courier: courier.name,
      alert: true
    };
  }
}

// 使用示例：检测配送员当前位置
const currentLocation = {
  type: 'Point',
  coordinates: [116.405, 39.915]
};

const geofenceCheck = await checkGeofence('courier-001', currentLocation);
console.log(geofenceCheck);
// 输出: { valid: true, message: '在服务区域内', courier: '张三' }
```

**步骤三：配送区域重叠检测**
```typescript
async function detectOverlappingAreas() {
  const overlappingPairs = [];

  // 获取所有活跃配送员
  const activeCouriers = await db.query('couriers')
    .where('status', '=', 'active')
    .toArray();

  // 两两检测重叠
  for (let i = 0; i < activeCouriers.length; i++) {
    for (let j = i + 1; j < activeCouriers.length; j++) {
      const courier1 = activeCouriers[i];
      const courier2 = activeCouriers[j];

      // 使用 overlaps 谓词检测重叠
      const overlaps = await db.query('couriers')
        .where('id', '=', courier1.id)
        .overlaps('serviceArea', courier2.serviceArea)
        .count();

      if (overlaps > 0) {
        overlappingPairs.push({
          courier1: courier1.name,
          courier2: courier2.name,
          severity: 'high',
          recommendation: '建议调整服务区域边界'
        });
      }
    }
  }

  return overlappingPairs;
}

// 使用示例
const overlaps = await detectOverlappingAreas();
if (overlaps.length > 0) {
  console.log('发现', overlaps.length, '组重叠区域:');
  overlaps.forEach(pair => {
    console.log(`- ${pair.courier1} 与 ${pair.courier2} 的服务区域重叠`);
    console.log(`  建议: ${pair.recommendation}`);
  });
} else {
  console.log('✓ 未发现重叠区域');
}
```

**步骤四：查找可用配送员**
```typescript
async function findAvailableCouriers(deliveryAddress, filters = {}) {
  let query = db.query('couriers')
    .contains('serviceArea', deliveryAddress) // 配送地址在服务区域内
    .where('status', '=', 'active');          // 配送员状态为活跃

  // 应用车型筛选
  if (filters.vehicleType) {
    query = query.where('vehicleType', '=', filters.vehicleType);
  }

  const couriers = await query.toArray();

  // 计算距离配送地址的距离
  const couriersWithDistance = couriers.map(courier => {
    const distance = calculateDistance(
      deliveryAddress.coordinates,
      courier.serviceArea.coordinates[0][0] // 简化计算，使用服务区域中心
    );
    return { ...courier, distance };
  });

  // 按距离排序
  couriersWithDistance.sort((a, b) => a.distance - b.distance);

  return couriersWithDistance;
}

// 简化的距离计算函数（实际应用中应使用更精确的算法）
function calculateDistance(coords1, coords2) {
  const R = 6371; // 地球半径（km）
  const dLat = (coords2[1] - coords1[1]) * Math.PI / 180;
  const dLon = (coords2[0] - coords1[0]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coords1[1] * Math.PI / 180) * Math.cos(coords2[1] * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 使用示例：查找可以配送到指定地址的骑手
const deliveryAddress = {
  type: 'Point',
  coordinates: [116.405, 39.915]
};

const availableCouriers = await findAvailableCouriers(deliveryAddress, {
  vehicleType: 'electric_bike'
});

console.log('可用配送员:');
availableCouriers.forEach((courier, index) => {
  console.log(`${index + 1}. ${courier.name} (${courier.phone}) - ${courier.vehicleType}`);
});
```

**步骤五：禁行区检测**
```typescript
async function checkRestrictedZones(route) {
  // 获取所有禁行区
  const restrictedZones = await db.query('restricted-zones')
    .toArray();

  const violations = [];

  // 检查路线是否与禁行区相交
  for (const zone of restrictedZones) {
    const intersects = await db.query('restricted-zones')
      .where('id', '=', zone.id)
      .intersects('geometry', route)
      .count();

    if (intersects > 0) {
      violations.push({
        zoneName: zone.name,
        zoneType: zone.type,
        severity: 'critical',
        message: `路线经过 ${zone.name}`,
        action: '必须重新规划路线'
      });
    }
  }

  return {
    safe: violations.length === 0,
    violations,
    alternativeRoute: violations.length > 0 ? '需重新规划' : null
  };
}

// 使用示例：检测配送路线是否经过禁行区
const deliveryRoute = {
  type: 'LineString',
  coordinates: [
    [116.38, 39.91],
    [116.40, 39.915],  // 经过天安门区域
    [116.42, 39.92]
  ]
};

const routeCheck = await checkRestrictedZones(deliveryRoute);
if (!routeCheck.safe) {
  console.log('⚠️ 路线安全问题:');
  routeCheck.violations.forEach(violation => {
    console.log(`- ${violation.message}`);
    console.log(`  操作: ${violation.action}`);
  });
} else {
  console.log('✓ 路线安全，无禁行区');
}
```

</details>

#### 测试验证

```bash
# 运行测试
npm test -- chapter-02-delivery-management
```

#### 答案参考

<details>
<summary>查看完整答案</summary>

完整的实现代码位于 `/Users/zhangyuting/github/zhyt1985/webgeodb/docs/tutorials/zh/projects/chapter-02/delivery-management.ts`

</details>

---

## 常见问题

### Q: intersects 和 contains/within 有什么区别？应该用哪个？

**A:** 简单来说：
- **intersects** 是最宽松的条件，只要两个对象有任何交集（包括边界接触）就返回 true
- **contains** 要求第一个对象完全包含第二个对象（被包含对象的边界必须在内部）
- **within** 要求第一个对象完全在第二个对象内部

**选择建议：**
- 默认使用 `intersects`，性能最好且适用范围最广
- 查找"某个区域内的点"时使用 `within`（如：商圈内的餐厅）
- 查找"包含某个点的区域"时使用 `contains`（如：哪个区包含这个地标）

### Q: 为什么我的查询很慢？如何优化？

**A:** 查询慢通常有以下几个原因：

1. **缺少空间索引**：为几何字段创建 R-tree 索引
   ```typescript
   await db.createIndex('tableName', {
     type: 'spatial',
     field: 'geometry',
     indexType: 'rtree'
   });
   ```

2. **没有使用 limit**：限制返回结果数量
   ```typescript
   .limit(100)  // 避免返回过多数据
   ```

3. **过于复杂的查询**：分解复杂查询为多个简单查询

4. **数据量过大**：考虑使用 `offset` 实现分页，或使用基于游标的分页

5. **索引失效**：在大量数据更新后重建索引
   ```typescript
   await db.rebuildIndex('tableName', 'geometry');
   ```

### Q: 如何判断应该使用哪种空间索引？

**A:** 根据数据特征和查询模式选择：

| 场景 | 推荐索引 | 原因 |
|------|---------|------|
| 点数据（POI、地址） | Grid | 均匀分布时性能最优 |
| 复杂几何（多边形、行政区划） | R-tree | 范围查询性能好 |
| 中小型数据集（< 10万条） | Quadtree | 实现简单，内存占用低 |
| 静态数据，复杂查询 | R-tree | 更新成本高但查询性能好 |
| 动态数据，频繁更新 | Quadtree | 更新成本相对较低 |

**通用建议：** 先使用 R-tree（默认），如果性能不满意再根据具体情况调整。

### Q: touches 和 intersects 有什么区别？

**A:** 主要区别在于边界接触的定义：

- **touches**: 两个几何对象**仅在边界接触**，内部不相交
  - 例如：两个相邻的行政区划
- **intersects**: 两个几何对象有任何交集（包括内部重叠或边界接触）
  - 例如：覆盖范围有重叠的两个配送区域

**关系：** `touches` 是 `intersects` 的特殊情况（内部不相交时）。如果 `touches` 返回 true，则 `intersects` 也返回 true；反之则不一定。

### Q: 如何处理大量数据的导入和索引创建？

**A:** 最佳实践是先导入数据，再创建索引：

```typescript
// 1. 批量导入数据（速度更快）
const batchSize = 1000;
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  await db.insert('houses', batch);
}

// 2. 导入完成后统一创建索引（比逐条插入时维护索引快10-100倍）
await db.createIndex('houses', {
  type: 'spatial',
  field: 'geometry',
  indexType: 'rtree'
});

// 3. 验证索引是否创建成功
const indexes = await db.getIndexes('houses');
console.log('索引列表:', indexes);
```

### Q: overlaps 和 crosses 有什么区别？

**A:** 两个谓词都检测交集，但关注点不同：

- **overlaps**: 两个**同维度**几何对象部分重叠（但不是完全包含）
  - 适用：面-面重叠、线-线重叠
  - 例如：两个配送区域部分覆盖

- **crosses**: 不同维度几何对象或线-线之间的交叉
  - 适用：线穿过面、线穿过线
  - 例如：道路穿过行政区划

**简单记忆：**
- 同维度用 `overlaps`
- 不同维度（主要是线）用 `crosses`

---

## 小结

本章深入讲解了 WebGeoDB 的空间查询功能，从基础属性查询到复杂空间谓词，从索引优化到实战应用。通过两个完整的实战案例，你应该已经掌握了：

### 核心要点回顾

- ✅ **属性查询进阶**: 使用多条件组合、嵌套属性、排序分页构建复杂查询
- ✅ **8个空间谓词**: intersects、contains、within、equals、disjoint、crosses、touches、overlaps，理解每个谓词的适用场景
- ✅ **空间索引**: 根据数据特征选择 R-tree、Quadtree 或 Grid 索引，大幅提升查询性能
- ✅ **复杂查询组合**: 灵活组合空间谓词和属性条件，解决实际业务问题
- ✅ **实战应用**: 房地产搜索和配送区域管理的完整实现

### 性能优化最佳实践

1. **始终使用索引**: 为几何字段创建合适的空间索引
2. **限制结果数量**: 使用 `limit` 避免返回过多数据
3. **批量操作**: 数据导入完成后统一创建索引
4. **选择合适的谓词**: 默认使用 `intersects`（性能最优）
5. **定期维护**: 数据大量更新后重建索引

### 下一步学习

- **[第3章: 数据建模与性能优化](./chapter-03-data-modeling.md)** - 深入学习数据模型设计和高级性能优化技巧
- **[第4章: 地图可视化](./chapter-04-visualization.md)** - 将查询结果渲染到地图上
- **[第5章: 高级主题](./chapter-05-advanced-topics.md)** - 离线支持、数据同步、安全等高级功能
- **[空间引擎 API](../../api/spatial-engine.md)** - 查看完整的空间引擎参考文档
- **[实战示例代码](../../examples/)** - 查看更多实际应用场景的示例代码

---

## 参考资源

### 文档
- **[API 参考文档](../../api/reference.md)** - 完整的 API 参考
- **[空间引擎指南](../../api/spatial-engine.md)** - 空间引擎详细说明
- **[索引优化指南](../../performance/index-optimization.md)** - 索引性能调优

### 示例代码
- **[房地产搜索完整示例](../../examples/tutorial-02/real-estate-search/)** - 第2章场景1完整代码
- **[配送管理系统完整示例](../../examples/tutorial-02/delivery-management/)** - 第2章场景2完整代码
- **[空间谓词演示](../../examples/spatial-predicates/)** - 所有8个空间谓词的可视化演示

### 外部资源
- **[OGC 简单要素规范](https://www.ogc.org/standards/sfa)** - OGC 空间谓词标准定义
- **[Turf.js 手册](https://turfjs.org/)** - WebGeoDB 默认空间引擎的文档
- **[R-tree 算法详解](https://en.wikipedia.org/wiki/R-tree)** - R-tree 索引原理
- **[GeoJSON 规范](https://geojson.org/)** - GeoJSON 格式标准

### 工具
- **[geojson.io](http://geojson.io/)** - 在线 GeoJSON 编辑器，用于测试几何对象
- **[Mapbox Tippycanoe](https://github.com/mapbox/tippecanoe)** - 矢量切片生成工具
- **[QGIS](https://qgis.org/)** - 开源桌面 GIS 软件，用于数据分析

---

**下一章预告:** 第3章将深入讲解数据建模的最佳实践，包括如何设计高效的地理数据模型、处理复杂的空间关系，以及更多高级性能优化技巧。
