# WebGeoDB：浏览器端的空间数据库

> 一个轻量级、高性能的 Web 端空间数据库，让离线地图应用开发变得简单

---

## 前言

你是否遇到过这些问题：

- 想在浏览器中实现离线地图应用，但 SQLite WASM 太大（~1MB）？
- 需要在前端进行空间查询，但没有合适的工具？
- 想要 PostGIS 的功能，但又不想依赖后端服务器？
- 需要在 PWA 应用中存储和查询地理数据？

如果你有以上任何一个需求，那么 **WebGeoDB** 就是为你准备的。

---

## 一、为什么需要浏览器端空间数据库？

### 1.1 离线地图应用的痛点

传统的 Web 地图应用严重依赖网络：

```
用户操作 → 发送请求 → 服务器查询 → 返回结果 → 渲染地图
   ↑                                              ↓
   └──────────── 网络延迟 100-500ms ────────────┘
```

**问题**：
- ❌ 网络不稳定时无法使用
- ❌ 每次查询都需要等待网络响应
- ❌ 服务器成本高（数据库、带宽）
- ❌ 无法在离线环境使用（地铁、飞机、偏远地区）

### 1.2 现有方案的局限性

#### SQLite WASM

```javascript
// SQLite WASM 的问题
import initSqlJs from 'sql.js';

const SQL = await initSqlJs({
  locateFile: file => `https://cdn.example.com/${file}`
});

// 问题 1: 体积太大（~1MB）
// 问题 2: 不支持空间索引
// 问题 3: 空间查询需要加载 SpatiaLite 扩展（更大）
```

**局限性**：
- 📦 体积大（~1MB，加上 SpatiaLite 更大）
- 🐌 空间查询性能差（没有 R-Tree 索引）
- 🔧 配置复杂（需要加载 WASM 文件）
- 💾 内存占用高

#### 纯 IndexedDB

```javascript
// 纯 IndexedDB 的问题
const db = await openDB('my-db', 1);

// 问题 1: 没有空间索引
const allPoints = await db.getAll('points');
const nearby = allPoints.filter(p =>
  calculateDistance(p.location, myLocation) < 1000
); // 全表扫描！

// 问题 2: 没有 SQL 支持
// 问题 3: 需要手动实现空间算法
```

**局限性**：
- 🔍 没有空间索引（全表扫描）
- 📝 没有 SQL 支持（只有 Key-Value API）
- 🧮 需要手动实现空间算法
- 🐛 容易出错

### 1.3 WebGeoDB 的解决方案

WebGeoDB 专为浏览器端空间数据设计：

```
┌─────────────────────────────────────────┐
│         WebGeoDB 架构                    │
├─────────────────────────────────────────┤
│  SQL API (PostgreSQL/PostGIS 兼容)     │
│  链式查询 API (类似 Dexie.js)           │
├─────────────────────────────────────────┤
│  空间索引 (R-Tree + Flatbush)          │
│  几何计算 (Turf.js + JSTS)             │
├─────────────────────────────────────────┤
│  存储层 (IndexedDB + Dexie.js)         │
└─────────────────────────────────────────┘
```

**优势**：
- ✅ 轻量级（~200KB，比 SQLite WASM 小 80%）
- ✅ 高性能（查询响应 <10ms，支持 R-Tree 索引）
- ✅ 易用性（SQL + 链式 API，学习成本低）
- ✅ 完整功能（PostGIS 兼容的空间函数）

---

## 二、核心特性

### 2.1 轻量级

```bash
# 包大小对比
SQLite WASM:     ~1,000 KB
SQLite + Spatial: ~2,000 KB
WebGeoDB:         ~200 KB  ✅ 小 80%
```

### 2.2 高性能

```typescript
// 性能对比（10,000 条数据）
┌──────────────────┬──────────┬──────────┐
│ 操作             │ SQLite   │ WebGeoDB │
├──────────────────┼──────────┼──────────┤
│ 插入 10K 条      │ ~500ms   │ ~200ms   │
│ 空间查询（相交） │ ~100ms   │ <10ms    │
│ 距离查询         │ ~150ms   │ <10ms    │
│ 索引命中率       │ 60%      │ 85%      │
└──────────────────┴──────────┴──────────┘
```

**性能优化**：
- R-Tree 空间索引（动态数据）
- Flatbush 静态索引（只读数据）
- LRU 查询缓存
- BBox 预检查优化

### 2.3 SQL 支持

完整的 PostgreSQL/PostGIS 兼容 SQL：

```sql
-- 标准 SQL
SELECT * FROM features
WHERE type = 'restaurant'
  AND rating >= 4.5
ORDER BY rating DESC
LIMIT 10;

-- PostGIS 空间函数
SELECT * FROM features
WHERE ST_DWithin(
  geometry,
  ST_MakePoint(116.4, 39.9),
  1000
);

-- 参数化查询
SELECT * FROM features
WHERE type = $1 AND rating >= $2;
```

**支持的 PostGIS 函数**：
- `ST_Intersects`, `ST_Contains`, `ST_Within`
- `ST_DWithin`, `ST_Distance`
- `ST_MakePoint`, `ST_GeomFromText`
- `ST_Buffer`, `ST_Centroid`

### 2.4 链式 API

类似 Dexie.js 的链式查询：

```typescript
// 链式查询
const results = await db.table('features')
  .where('type', '=', 'restaurant')
  .where('rating', '>=', 4.5)
  .distance('geometry', myLocation, '<', 1000)
  .orderBy('rating', 'desc')
  .limit(10)
  .toArray();
```

### 2.5 性能监控

内置性能监控系统：

```typescript
// 启用性能分析
await db.enableProfiling(true);

// 获取统计
const stats = await db.getStats();
console.log(`平均查询时间: ${stats.avgQueryTime}ms`);
console.log(`索引命中率: ${(stats.indexHitRate * 100).toFixed(1)}%`);

// 查看慢查询
const slowQueries = await db.getSlowQueries(100);
```

### 2.6 完善的错误处理

6 种结构化错误类型：

```typescript
try {
  await db.query('SELECT * FROM features');
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error('数据库错误:', error.code);
  } else if (error instanceof SQLError) {
    console.error('SQL 错误:', error.message);
  }
}
```

---


## 三、5 分钟快速开始

### 3.1 安装

```bash
npm install webgeodb-core@beta
```

### 3.2 创建数据库

```typescript
import { WebGeoDB } from 'webgeodb-core';

// 创建数据库
const db = new WebGeoDB('my-geo-db');
await db.open();

// 创建表
await db.createTable('restaurants', {
  id: 'number',
  name: 'string',
  geometry: 'geometry',
  rating: 'number'
});
```

### 3.3 插入数据

```typescript
// 插入餐厅数据
await db.insert('restaurants', {
  id: 1,
  name: '北京烤鸭店',
  geometry: {
    type: 'Point',
    coordinates: [116.4074, 39.9042]  // [经度, 纬度]
  },
  rating: 4.5
});
```

### 3.4 空间查询

```typescript
// 查询附近 1km 内的餐厅
const myLocation = [116.4074, 39.9042];

const nearby = await db.table('restaurants')
  .distance('geometry', myLocation, '<', 1000)
  .toArray();

console.log(`附近有 ${nearby.length} 家餐厅`);
```

### 3.5 SQL 查询

```typescript
// 使用 PostGIS 函数
const results = await db.query(`
  SELECT * FROM restaurants
  WHERE ST_DWithin(
    geometry,
    ST_MakePoint($1, $2),
    $3
  )
`, [116.4074, 39.9042, 1000]);
```

**就这么简单！** 5 分钟内你就可以在浏览器中实现空间查询。

---

## 四、实际应用场景

### 4.1 离线地图应用

**场景**：用户在地铁、飞机等离线环境中使用地图应用。

```typescript
// 离线地图应用示例
class OfflineMapApp {
  private db: WebGeoDB;

  async init() {
    this.db = new WebGeoDB('offline-map');
    await this.db.open();

    // 创建 POI 表
    await this.db.createTable('pois', {
      id: 'number',
      name: 'string',
      type: 'string',
      geometry: 'geometry'
    });
  }

  // 下载并缓存 POI 数据
  async downloadPOIs(bbox: BBox) {
    const pois = await fetch(`/api/pois?bbox=${bbox}`).then(r => r.json());
    await this.db.insertMany('pois', pois);
  }

  // 离线搜索附近的 POI
  async searchNearby(location: [number, number], radius: number) {
    return await this.db.table('pois')
      .distance('geometry', location, '<', radius)
      .toArray();
  }
}
```

**优势**：
- ✅ 完全离线可用
- ✅ 查询速度快（<10ms）
- ✅ 节省流量和服务器成本

### 4.2 实时位置追踪

**场景**：记录用户的运动轨迹（跑步、骑行、徒步）。

```typescript
// 运动轨迹记录
class FitnessTracker {
  private db: WebGeoDB;

  async recordLocation(location: [number, number]) {
    await this.db.insert('tracks', {
      timestamp: Date.now(),
      geometry: {
        type: 'Point',
        coordinates: location
      }
    });
  }

  // 计算运动距离
  async getTotalDistance() {
    const points = await this.db.table('tracks')
      .orderBy('timestamp', 'asc')
      .toArray();

    let distance = 0;
    for (let i = 1; i < points.length; i++) {
      distance += calculateDistance(
        points[i - 1].geometry.coordinates,
        points[i].geometry.coordinates
      );
    }
    return distance;
  }

  // 查询某个区域内的轨迹点
  async getPointsInArea(bbox: Polygon) {
    return await this.db.table('tracks')
      .intersects('geometry', bbox)
      .toArray();
  }
}
```

### 4.3 地理围栏

**场景**：当用户进入或离开某个区域时触发通知。

```typescript
// 地理围栏系统
class GeofenceSystem {
  private db: WebGeoDB;

  // 创建围栏
  async createGeofence(name: string, polygon: Polygon) {
    await this.db.insert('geofences', {
      name,
      geometry: polygon,
      active: true
    });
  }

  // 检查用户是否在围栏内
  async checkGeofences(userLocation: Point) {
    const triggered = await this.db.query(`
      SELECT * FROM geofences
      WHERE active = true
        AND ST_Contains(geometry, ST_GeomFromText($1))
    `, [pointToWKT(userLocation)]);

    return triggered;
  }
}
```

### 4.4 房地产搜索

**场景**：搜索特定区域内的房源。

```typescript
// 房地产搜索应用
class RealEstateSearch {
  private db: WebGeoDB;

  // 搜索区域内的房源
  async searchInArea(bbox: Polygon, filters: any) {
    return await this.db.query(`
      SELECT * FROM properties
      WHERE ST_Intersects(geometry, ST_GeomFromText($1))
        AND price >= $2 AND price <= $3
        AND bedrooms >= $4
      ORDER BY price ASC
    `, [
      polygonToWKT(bbox),
      filters.minPrice,
      filters.maxPrice,
      filters.minBedrooms
    ]);
  }

  // 搜索地铁站附近的房源
  async searchNearSubway(subwayStation: Point, radius: number) {
    return await this.db.table('properties')
      .distance('geometry', subwayStation.coordinates, '<', radius)
      .orderBy('price', 'asc')
      .toArray();
  }
}
```


---

## 五、性能对比

### 5.1 测试环境

- **浏览器**: Chrome 120
- **数据量**: 10,000 条 POI 数据
- **设备**: MacBook Pro M1

### 5.2 插入性能

```
┌─────────────────┬──────────┬──────────┬────────┐
│ 方案            │ 10K 插入 │ 索引构建 │ 总时间 │
├─────────────────┼──────────┼──────────┼────────┤
│ SQLite WASM     │ 450ms    │ 50ms     │ 500ms  │
│ 纯 IndexedDB    │ 180ms    │ -        │ 180ms  │
│ WebGeoDB        │ 150ms    │ 50ms     │ 200ms  │
└─────────────────┴──────────┴──────────┴────────┘
```

### 5.3 查询性能

```
┌─────────────────┬──────────┬──────────┬──────────┐
│ 查询类型        │ SQLite   │ IndexedDB│ WebGeoDB │
├─────────────────┼──────────┼──────────┼──────────┤
│ 相交查询        │ 95ms     │ 850ms    │ 8ms      │
│ 距离查询        │ 120ms    │ 920ms    │ 6ms      │
│ 包含查询        │ 110ms    │ 780ms    │ 9ms      │
│ 属性查询        │ 15ms     │ 12ms     │ 5ms      │
└─────────────────┴──────────┴──────────┴──────────┘
```

**结论**：
- 🚀 WebGeoDB 空间查询比 SQLite WASM 快 **10-15 倍**
- 🚀 WebGeoDB 空间查询比纯 IndexedDB 快 **100+ 倍**
- 📦 WebGeoDB 体积比 SQLite WASM 小 **80%**

### 5.4 内存占用

```
┌─────────────────┬──────────┬──────────┐
│ 方案            │ 初始内存 │ 10K 数据 │
├─────────────────┼──────────┼──────────┤
│ SQLite WASM     │ 8MB      │ 25MB     │
│ 纯 IndexedDB    │ 2MB      │ 15MB     │
│ WebGeoDB        │ 3MB      │ 18MB     │
└─────────────────┴──────────┴──────────┘
```

---

## 六、技术架构

### 6.1 分层架构

```
┌─────────────────────────────────────────┐
│         应用层 (Application)             │
│  - React/Vue/Angular 组件                │
│  - 地图库集成 (Leaflet/Mapbox)          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         查询层 (Query Engine)            │
│  - SQL 解析器 (node-sql-parser)         │
│  - 链式查询 API                          │
│  - 查询优化器                            │
└─────────────────────────────────────────┘
                    ↓
┌──────────────────┬──────────────────────┐
│  空间索引        │    几何计算           │
│  - R-Tree        │    - Turf.js         │
│  - Flatbush      │    - JSTS (可选)     │
└──────────────────┴──────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         存储层 (Storage)                 │
│  - IndexedDB (Dexie.js)                 │
│  - LRU 缓存                              │
└─────────────────────────────────────────┘
```

### 6.2 核心技术

**存储层**：
- IndexedDB：浏览器原生数据库
- Dexie.js：IndexedDB 封装库

**空间索引**：
- R-Tree (rbush)：动态空间索引
- Flatbush：静态空间索引（只读数据）

**几何计算**：
- Turf.js：轻量级地理空间分析
- JSTS：精确拓扑操作（可选）

**SQL 解析**：
- node-sql-parser：SQL 解析器
- 自定义查询转换器

---

## 七、浏览器兼容性

```
✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
❌ IE 11 (不支持)
```

**兼容性检查**：

```typescript
if (!window.indexedDB) {
  console.error('您的浏览器不支持 IndexedDB');
  // 使用降级方案
}
```

---

## 八、开始使用

### 8.1 安装

```bash
npm install webgeodb-core@beta
```

### 8.2 文档

- **快速开始**: https://github.com/webgeodb/webgeodb/blob/main/docs/guides/quick-start.md
- **API 参考**: https://github.com/webgeodb/webgeodb/blob/main/docs/api/reference.md
- **示例项目**: https://github.com/webgeodb/webgeodb/tree/main/examples

### 8.3 社区

- **GitHub**: https://github.com/webgeodb/webgeodb
- **Issues**: https://github.com/webgeodb/webgeodb/issues
- **Discussions**: https://github.com/webgeodb/webgeodb/discussions

---

## 九、总结

WebGeoDB 是一个专为浏览器端设计的轻量级空间数据库：

**核心优势**：
- 🪶 轻量级（~200KB）
- ⚡ 高性能（<10ms 查询）
- 🛠️ 易用性（SQL + 链式 API）
- 📱 离线优先（完整的离线支持）
- 🌐 跨平台（支持所有现代浏览器）

**适用场景**：
- 离线地图应用
- 实时位置追踪
- 地理围栏系统
- 房地产搜索
- PWA 应用

**立即开始**：

```bash
npm install webgeodb-core@beta
```

---

## 关于作者

WebGeoDB 是一个开源项目，欢迎贡献代码和反馈。

如果这篇文章对你有帮助，请给项目一个 ⭐️ Star：
https://github.com/webgeodb/webgeodb

---

**标签**: #WebGeoDB #空间数据库 #IndexedDB #离线地图 #PostGIS #前端开发 #PWA

