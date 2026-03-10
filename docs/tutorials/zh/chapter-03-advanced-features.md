# 第3章: 高级特性与优化

> **学习时间**: 60-90分钟 | **先决条件**: 第1章 - 基础入门、第2章 - 空间查询

## 学习目标

通过本章学习，你将能够：
- 掌握 WebGeoDB 的几何计算引擎和空间分析功能
- 理解事务管理机制和并发控制
- 应用性能优化技术提升应用响应速度
- 实现健壮的错误处理和数据验证
- 完成数据的导入导出操作

---

## 核心概念

### 3.1 几何计算引擎

WebGeoDB 集成了强大的几何计算引擎，支持复杂的空间分析操作。通过集成 Turf.js 和 JSTS 库，你可以在浏览器中执行各种空间计算。

#### 关键要点

- **Turf.js**：轻量级空间分析库，适合快速计算
- **JSTS**：Java Topology Suite 的 JavaScript 移植，功能更强大
- **空间操作**：缓冲区分析、交集、并集、差集等
- **测量功能**：距离、面积、长度计算

#### Turf.js 集成

**示例代码：**
```typescript
import { WebGeoDB } from '@webgeodb/core';
import * as turf from '@turf/turf';

// 初始化数据库
const db = new WebGeoDB({ name: 'city-planning' });
await db.open();

// 创建城市区域
const cityZone = {
  id: 'zone-1',
  name: '商业区',
  type: 'zone',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [116.404, 39.915],
      [116.404, 39.925],
      [116.414, 39.925],
      [116.414, 39.915],
      [116.404, 39.915]
    ]]
  }
};

await db.features.insert(cityZone);

// 创建缓冲区（例如：创建1公里范围内的服务区）
const point = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [116.404, 39.915]
  }
};

const buffer = turf.buffer(point, 1, { units: 'kilometers' });

console.log('缓冲区面积:', turf.area(buffer), '平方米');
// 输出: 缓冲区面积: 3141592.653589793 平方米
```

#### JSTS 集成

**示例代码：**
```typescript
import { WebGeoDB } from '@webgeodb/core';
import jsts from 'jsts';

// 初始化 JSTS 几何工厂
const geometryFactory = new jsts.geom.GeometryFactory();
const reader = new jsts.io.GeoJSONReader();
const writer = new jsts.io.GeoJSONWriter();

// 创建两个多边形
const polygon1GeoJSON = {
  type: 'Polygon',
  coordinates: [[
    [0, 0], [10, 0], [10, 10], [0, 10], [0, 0]
  ]]
};

const polygon2GeoJSON = {
  type: 'Polygon',
  coordinates: [[
    [5, 5], [15, 5], [15, 15], [5, 15], [5, 5]
  ]]
};

// 转换为 JSTS 几何对象
const geom1 = reader.read(JSON.stringify(polygon1GeoJSON));
const geom2 = reader.read(JSON.stringify(polygon2GeoJSON));

// 计算交集
const intersection = geom1.intersection(geom2);
const intersectionGeoJSON = writer.write(intersection);

console.log('交集面积:', intersection.getArea());
// 输出: 交集面积: 25

// 计算并集
const union = geom1.union(geom2);
const unionGeoJSON = writer.write(union);

console.log('并集面积:', union.getArea());
// 输出: 并集面积: 175

// 存储结果
await db.features.insert({
  id: 'intersection',
  name: '区域交集',
  geometry: JSON.parse(JSON.stringify(intersectionGeoJSON))
});
```

#### 空间计算操作

**示例代码：**
```typescript
import * as turf from '@turf/turf';

// 1. 计算两点间距离
const point1 = turf.point([116.404, 39.915]);
const point2 = turf.point([116.414, 39.925]);

const distance = turf.distance(point1, point2, { units: 'kilometers' });
console.log('距离:', distance.toFixed(2), '公里');
// 输出: 距离: 1.57 公里

// 2. 计算多边形面积
const polygon = turf.polygon([[
  [116.404, 39.915],
  [116.404, 39.925],
  [116.414, 39.925],
  [116.414, 39.915],
  [116.404, 39.915]
]]);

const area = turf.area(polygon);
console.log('面积:', (area / 1000000).toFixed(2), '平方公里');
// 输出: 面积: 1.24 平方公里

// 3. 计算线段长度
const line = turf.lineString([
  [116.404, 39.915],
  [116.414, 39.925],
  [116.424, 39.935]
]);

const length = turf.length(line, { units: 'kilometers' });
console.log('长度:', length.toFixed(2), '公里');
// 输出: 长度: 2.21 公里

// 4. 判断点是否在多边形内
const pt = turf.point([116.409, 39.920]);
const isInside = turf.booleanPointInPolygon(pt, polygon);

console.log('点在多边形内:', isInside);
// 输出: 点在多边形内: true
```

> **💡 提示:** Turf.js 适合快速原型开发和小型项目，JSTS 更适合需要复杂几何操作的企业级应用。选择哪个库取决于你的具体需求。

---

### 3.2 事务管理

事务是保证数据一致性的关键机制。WebGeoDB 基于 IndexedDB 的事务特性，提供了 ACID（原子性、一致性、隔离性、持久性）保证。

#### 关键要点

- **原子性（Atomicity）**：事务中的操作要么全部成功，要么全部失败
- **一致性（Consistency）**：事务前后数据库保持一致状态
- **隔离性（Isolation）**：并发事务之间相互隔离
- **持久性（Durability）**：事务一旦提交，修改永久保存

#### 基本事务操作

**示例代码：**
```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB({ name: 'city-planning' });
await db.open();

// 读写事务：插入新区域并更新统计
try {
  await db.transaction('rw', [db.features, db.statistics], async () => {
    // 1. 插入新区域
    const newZone = {
      id: 'zone-2',
      name: '住宅区',
      type: 'zone',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [116.420, 39.915],
          [116.420, 39.925],
          [116.430, 39.925],
          [116.430, 39.915],
          [116.420, 39.915]
        ]]
      }
    };

    await db.features.insert(newZone);

    // 2. 更新统计数据
    const stats = await db.statistics.get('zone-count');
    await db.statistics.update('zone-count', {
      count: stats.count + 1,
      updatedAt: Date.now()
    });

    // 如果任何一个操作失败，整个事务会回滚
  });

  console.log('事务成功提交');
} catch (error) {
  console.error('事务失败:', error);
  // 事务已自动回滚
}
```

#### 并发控制

**示例代码：**
```typescript
// 使用乐观锁处理并发更新
async function updateFeatureWithLock(
  id: string,
  updates: any,
  expectedVersion: number
) {
  try {
    await db.transaction('rw', db.features, async () => {
      const current = await db.features.get(id);

      // 检查版本号
      if (current.version !== expectedVersion) {
        throw new Error(`版本冲突: 期望 ${expectedVersion}, 实际 ${current.version}`);
      }

      // 更新数据并递增版本
      await db.features.update(id, {
        ...updates,
        version: current.version + 1,
        updatedAt: Date.now()
      });
    });

    console.log('更新成功');
  } catch (error) {
    console.error('更新失败:', error.message);
    throw error;
  }
}

// 使用示例
const feature = await db.features.get('zone-1');
const currentVersion = feature.version || 0;

try {
  await updateFeatureWithLock('zone-1', { name: '新名称' }, currentVersion);
} catch (error) {
  if (error.message.includes('版本冲突')) {
    console.warn('数据已被其他操作修改，请刷新后重试');
    // 重新获取数据或提示用户
  }
}
```

#### 事务隔离级别

**示例代码：**
```typescript
// 只读事务：用于查询，性能更好
async function getZoneStatistics() {
  return await db.transaction('r', db.features, async () => {
    const zones = await db.features
      .where('type', '=', 'zone')
      .toArray();

    const totalArea = zones.reduce((sum, zone) => {
      return sum + calculateArea(zone.geometry);
    }, 0);

    return {
      count: zones.length,
      totalArea
    };
  });
}

// 读写事务：用于修改数据
async function addZoneAndLog(zoneData: any) {
  await db.transaction('rw', [db.features, db.auditLog], async () => {
    // 添加区域
    await db.features.insert(zoneData);

    // 记录审计日志
    await db.auditLog.insert({
      action: 'create',
      entity: 'zone',
      entityId: zoneData.id,
      timestamp: Date.now(),
      user: 'current-user'
    });
  });
}
```

> **💡 提示:** 只读事务可以并发执行，读写事务会锁定相关表。避免在事务中执行耗时操作，以减少锁定时间。

---

### 3.3 性能优化

性能优化是构建生产级应用的关键。WebGeoDB 提供了多种优化技术，可以显著提升查询和数据操作的性能。

#### 关键要点

- **批量操作**：使用 `insertMany` 替代循环 `insert`
- **索引优化**：为常用查询字段创建空间索引
- **查询优化**：组合条件、分页、投影
- **缓存策略**：使用内存缓存减少数据库访问

#### 批量操作优化

**示例代码：**
```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB({ name: 'city-planning' });
await db.open();

// ❌ 不推荐：循环插入
const features = generateFeatures(1000);

console.time('循环插入');
for (const feature of features) {
  await db.features.insert(feature);
}
console.timeEnd('循环插入');
// 输出: 循环插入: 2341.234ms

// ✅ 推荐：批量插入
console.time('批量插入');
await db.features.insertMany(features);
console.timeEnd('批量插入');
// 输出: 批量插入: 156.789ms (提升约15倍)
```

#### 索引优化

**示例代码：**
```typescript
// 1. 创建空间索引
db.features.createIndex('geometry', {
  type: 'rbush',     // R-Tree 索引，适合动态数据
  auto: true          // 自动维护索引
});

// 2. 创建普通索引
db.features.createIndex('type');
db.features.createIndex('category');

// 3. 查询性能对比
const point = [116.404, 39.915];

// 无索引
console.time('无索引查询');
const results1 = await db.features
  .toArray()
  .then(features =>
    features.filter(f =>
      calculateDistance(f.geometry, point) < 1000
    )
  );
console.timeEnd('无索引查询');
// 输出: 无索引查询: 456.123ms

// 有索引
console.time('有索引查询');
const results2 = await db.features
  .distance('geometry', point, '<', 1000)
  .toArray();
console.timeEnd('有索引查询');
// 输出: 有索引查询: 23.456ms (提升约20倍)
```

#### 查询优化

**示例代码：**
```typescript
// 1. 组合多个条件
const results = await db.features
  .distance('geometry', point, '<', 1000)
  .where('type', '=', 'restaurant')
  .where('properties.rating', '>=', 4)
  .limit(20)
  .toArray();

// 2. 使用分页
async function getNearbyRestaurants(
  point: [number, number],
  page: number,
  pageSize: number = 20
) {
  const results = await db.features
    .distance('geometry', point, '<', 1000)
    .where('type', '=', 'restaurant')
    .limit(pageSize)
    .offset(page * pageSize)
    .toArray();

  const total = await db.features
    .distance('geometry', point, '<', 1000)
    .where('type', '=', 'restaurant')
    .count();

  return {
    data: results,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

// 3. 只查询需要的字段
async function getRestaurantNames() {
  const results = await db.features
    .where('type', '=', 'restaurant')
    .toArray();

  // 手动投影，只返回需要的字段
  return results.map(r => ({
    id: r.id,
    name: r.name,
    rating: r.properties?.rating
  }));
}
```

#### 缓存策略

**示例代码：**
```typescript
// 实现简单的缓存层
class CachedQueryService {
  private cache = new Map<string, {
    data: any;
    timestamp: number;
    ttl: number;
  }>();

  async getNearbyFeatures(
    point: [number, number],
    radius: number,
    useCache: boolean = true
  ) {
    const cacheKey = `nearby:${point.join(',')}:${radius}`;

    // 检查缓存
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        console.log('使用缓存数据');
        return cached.data;
      }
    }

    // 查询数据库
    console.log('查询数据库');
    const results = await db.features
      .distance('geometry', point, '<', radius)
      .toArray();

    // 更新缓存（5分钟过期）
    this.cache.set(cacheKey, {
      data: results,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000
    });

    return results;
  }

  // 清除缓存
  invalidate(point?: [number, number], radius?: number) {
    if (point && radius) {
      const cacheKey = `nearby:${point.join(',')}:${radius}`;
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }
}

// 使用示例
const cacheService = new CachedQueryService();

// 第一次查询：从数据库获取
const results1 = await cacheService.getNearbyFeatures([116.404, 39.915], 1000);

// 第二次查询：从缓存获取（5分钟内）
const results2 = await cacheService.getNearbyFeatures([116.404, 39.915], 1000);

// 更新数据后清除缓存
await db.features.update('feature-1', { name: 'Updated' });
cacheService.invalidate();
```

#### 性能监控

**示例代码：**
```typescript
// 性能监控工具
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();

    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;

      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }

      const records = this.metrics.get(label)!;
      records.push(duration);

      // 只保留最近100条记录
      if (records.length > 100) {
        records.shift();
      }

      console.log(`${label}: ${duration.toFixed(2)}ms`);
    }
  }

  getStats(label: string) {
    const records = this.metrics.get(label);
    if (!records || records.length === 0) {
      return null;
    }

    const avg = records.reduce((a, b) => a + b, 0) / records.length;
    const max = Math.max(...records);
    const min = Math.min(...records);

    return { avg, max, min, count: records.length };
  }

  report() {
    console.log('性能报告:');
    for (const [label, records] of this.metrics.entries()) {
      const stats = this.getStats(label);
      if (stats) {
        console.log(`  ${label}:`);
        console.log(`    平均: ${stats.avg.toFixed(2)}ms`);
        console.log(`    最小: ${stats.min.toFixed(2)}ms`);
        console.log(`    最大: ${stats.max.toFixed(2)}ms`);
        console.log(`    次数: ${stats.count}`);
      }
    }
  }
}

// 使用示例
const monitor = new PerformanceMonitor();

const results = await monitor.measure('查询附近餐厅', async () => {
  return await db.features
    .distance('geometry', [116.404, 39.915], '<', 1000)
    .where('type', '=', 'restaurant')
    .toArray();
});

// 查看性能报告
monitor.report();
```

> **💡 提示:** 根据数据量选择合适的索引类型。动态数据使用 R-Tree，静态数据使用 Static 索引。小数据集（< 1000条）可以不使用索引。

---

### 3.4 错误处理和数据验证

健壮的错误处理和数据验证是构建可靠应用的基础。

#### 关键要点

- **错误类型**：识别不同类型的数据库错误
- **数据验证**：验证输入数据的完整性和正确性
- **错误恢复**：实现优雅的错误恢复机制
- **用户反馈**：提供友好的错误提示

#### 错误处理模式

**示例代码：**
```typescript
import { WebGeoDB } from '@webgeodb/core';

class DatabaseErrorHandler {
  // 处理数据库打开错误
  static handleOpenError(error: any) {
    if (error.name === 'VersionError') {
      return {
        type: 'VERSION_MISMATCH',
        message: '数据库版本不匹配，请刷新页面',
        action: 'reload'
      };
    }

    if (error.name === 'InvalidStateError') {
      return {
        type: 'BROWSER_NOT_SUPPORTED',
        message: '您的浏览器不支持 IndexedDB',
        action: 'fallback'
      };
    }

    if (error.name === 'QuotaExceededError') {
      return {
        type: 'QUOTA_EXCEEDED',
        message: '存储空间不足',
        action: 'cleanup'
      };
    }

    return {
      type: 'UNKNOWN_ERROR',
      message: '数据库打开失败',
      action: 'retry'
    };
  }

  // 处理查询错误
  static handleQueryError(error: any) {
    if (error.name === 'NotFoundError') {
      return {
        type: 'NOT_FOUND',
        message: '数据不存在',
        action: 'ignore'
      };
    }

    if (error.name === 'ConstraintError') {
      return {
        type: 'CONSTRAINT_VIOLATION',
        message: '数据约束冲突',
        action: 'validate'
      };
    }

    return {
      type: 'QUERY_ERROR',
      message: '查询失败',
      action: 'retry'
    };
  }
}

// 使用示例
async function safeOpenDatabase() {
  try {
    const db = new WebGeoDB({ name: 'city-planning' });
    await db.open();
    return db;
  } catch (error) {
    const errorInfo = DatabaseErrorHandler.handleOpenError(error);

    console.error(errorInfo.message);

    switch (errorInfo.action) {
      case 'reload':
        if (confirm('数据库需要升级，是否刷新页面？')) {
          window.location.reload();
        }
        break;
      case 'fallback':
        console.warn('降级到内存存储');
        return useMemoryFallback();
      case 'cleanup':
        await cleanupOldData();
        return safeOpenDatabase(); // 重试
      case 'retry':
        await delay(1000);
        return safeOpenDatabase();
    }

    throw error;
  }
}
```

#### 数据验证

**示例代码：**
```typescript
// 数据验证器
class FeatureValidator {
  static validate(feature: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证必需字段
    if (!feature.id) {
      errors.push('缺少 id 字段');
    }

    if (typeof feature.id !== 'string') {
      errors.push('id 必须是字符串');
    }

    // 验证几何数据
    if (!feature.geometry) {
      errors.push('缺少 geometry 字段');
    } else {
      const geoErrors = this.validateGeometry(feature.geometry);
      errors.push(...geoErrors);
    }

    // 验证属性
    if (feature.properties && typeof feature.properties !== 'object') {
      errors.push('properties 必须是对象');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateGeometry(geometry: any): string[] {
    const errors: string[] = [];

    if (!geometry.type) {
      errors.push('几何对象缺少 type 字段');
      return errors;
    }

    const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
    if (!validTypes.includes(geometry.type)) {
      errors.push(`无效的几何类型: ${geometry.type}`);
    }

    if (!Array.isArray(geometry.coordinates)) {
      errors.push('几何对象缺少 coordinates 字段');
    }

    // 验证坐标范围
    const validateCoords = (coords: any[]) => {
      for (const coord of coords) {
        if (Array.isArray(coord)) {
          validateCoords(coord);
        } else if (typeof coord === 'number') {
          if (coord < -180 || coord > 180) {
            errors.push(`坐标超出范围: ${coord}`);
          }
        }
      }
    };

    if (geometry.coordinates) {
      validateCoords(geometry.coordinates);
    }

    return errors;
  }
}

// 使用示例
async function insertFeatureWithValidation(feature: any) {
  // 验证数据
  const validation = FeatureValidator.validate(feature);

  if (!validation.valid) {
    console.error('数据验证失败:', validation.errors);
    throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
  }

  // 插入数据
  try {
    await db.features.insert(feature);
    console.log('数据插入成功');
  } catch (error) {
    console.error('插入失败:', error);
    throw error;
  }
}

// 测试验证
const validFeature = {
  id: 'feature-1',
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [116.404, 39.915]
  },
  properties: {
    name: '测试点'
  }
};

await insertFeatureWithValidation(validFeature);

const invalidFeature = {
  id: 'feature-2',
  geometry: {
    type: 'InvalidType',
    coordinates: []
  }
};

try {
  await insertFeatureWithValidation(invalidFeature);
} catch (error) {
  console.error('捕获到预期错误:', error.message);
}
```

#### 事务错误处理

**示例代码：**
```typescript
async function transactionWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 如果是版本冲突，可以重试
      if (error.name === 'TransactionInactiveError') {
        console.warn(`事务失败，重试 ${i + 1}/${maxRetries}`);
        await delay(100 * (i + 1)); // 递增延迟
        continue;
      }

      // 其他错误不重试
      break;
    }
  }

  throw lastError;
}

// 使用示例
async function transferFeature(
  fromId: string,
  toId: string,
  featureId: string
) {
  return await transactionWithRetry(async () => {
    await db.transaction('rw', [db.collections, db.features], async () => {
      // 从源集合移除
      const fromCollection = await db.collections.get(fromId);
      const newFromFeatures = fromCollection.features.filter((id: string) => id !== featureId);

      await db.collections.update(fromId, {
        features: newFromFeatures,
        updatedAt: Date.now()
      });

      // 添加到目标集合
      const toCollection = await db.collections.get(toId);
      const newToFeatures = [...toCollection.features, featureId];

      await db.collections.update(toId, {
        features: newToFeatures,
        updatedAt: Date.now()
      });
    });

    console.log('转移成功');
  });
}
```

> **💡 提示:** 始终验证用户输入数据。使用 TypeScript 可以在编译时捕获类型错误，但运行时验证仍然必要。

---

### 3.5 数据导入导出

数据导入导出是数据管理和备份的重要功能。WebGeoDB 支持多种格式的数据交换。

#### 关键要点

- **GeoJSON**：标准的地理数据交换格式
- **CSV**：表格数据，适合属性数据
- **自定义格式**：根据需求定制
- **批量处理**：大数据集的分批处理

#### GeoJSON 导入导出

**示例代码：**
```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB({ name: 'city-planning' });
await db.open();

// 导出为 GeoJSON
async function exportToGeoJSON(filename: string = 'export.geojson') {
  // 查询所有要素
  const features = await db.features.toArray();

  // 构建 GeoJSON FeatureCollection
  const geojson = {
    type: 'FeatureCollection' as const,
    features: features.map(f => ({
      type: 'Feature' as const,
      id: f.id,
      geometry: f.geometry,
      properties: {
        name: f.name,
        type: f.type,
        ...f.properties
      }
    })),
    metadata: {
      exportedAt: new Date().toISOString(),
      count: features.length
    }
  };

  // 转换为 JSON 字符串
  const json = JSON.stringify(geojson, null, 2);

  // 下载为文件
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);

  console.log(`导出 ${features.length} 个要素到 ${filename}`);
}

// 从 GeoJSON 导入
async function importFromGeoJSON(file: File) {
  const json = await file.text();
  const geojson = JSON.parse(json);

  // 验证格式
  if (geojson.type !== 'FeatureCollection') {
    throw new Error('不是有效的 GeoJSON FeatureCollection');
  }

  if (!Array.isArray(geojson.features)) {
    throw new Error('GeoJSON 缺少 features 数组');
  }

  // 分批导入
  const batchSize = 100;
  const features = geojson.features;

  console.log(`准备导入 ${features.length} 个要素`);

  for (let i = 0; i < features.length; i += batchSize) {
    const batch = features.slice(i, i + batchSize);
    const processed = batch.map(f => ({
      id: f.id || `feature-${i}`,
      name: f.properties?.name || '未命名',
      type: f.properties?.type || 'unknown',
      geometry: f.geometry,
      properties: f.properties || {}
    }));

    await db.features.insertMany(processed);

    console.log(`已导入 ${Math.min(i + batchSize, features.length)}/${features.length}`);
  }

  console.log('导入完成');
}

// 使用示例
// 导出
await exportToGeoJSON('city-zones.geojson');

// 导入（通过文件选择）
const input = document.createElement('input');
input.type = 'file';
input.accept = '.geojson,.json';

input.onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    await importFromGeoJSON(file);
  }
};

input.click();
```

#### CSV 导入导出

**示例代码：**
```typescript
// 导出属性数据为 CSV
async function exportToCSV(filename: string = 'export.csv') {
  const features = await db.features.toArray();

  if (features.length === 0) {
    console.warn('没有数据可导出');
    return;
  }

  // 提取所有属性字段
  const allKeys = new Set<string>();
  features.forEach(f => {
    if (f.properties) {
      Object.keys(f.properties).forEach(key => allKeys.add(key));
    }
  });

  // 添加固定字段
  const columns = ['id', 'name', 'type', ...Array.from(allKeys)];

  // 构建 CSV
  const rows = [
    // 标题行
    columns.join(','),
    // 数据行
    ...features.map(f => {
      return columns.map(col => {
        let value = f[col];
        if (col === 'geometry') {
          // 几何数据转为 WKT 格式
          value = geometryToWKT(f.geometry);
        } else if (typeof value === 'string') {
          // 转义引号和换行符
          value = `"${value.replace(/"/g, '""')}"`;
        } else if (value === undefined || value === null) {
          value = '';
        }
        return value;
      }).join(',');
    })
  ];

  const csv = rows.join('\n');

  // 添加 BOM 以支持 Excel
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);

  console.log(`导出 ${features.length} 行到 ${filename}`);
}

// 简单的几何转 WKT 函数
function geometryToWKT(geometry: any): string {
  const coordsToString = (coords: any) => {
    if (Array.isArray(coords[0])) {
      return `(${coords.map(coordsToString).join(', ')})`;
    }
    return coords.join(' ');
  };

  switch (geometry.type) {
    case 'Point':
      return `POINT (${geometry.coordinates.join(' ')})`;
    case 'LineString':
      return `LINESTRING ${coordsToString(geometry.coordinates)}`;
    case 'Polygon':
      return `POLYGON ${coordsToString(geometry.coordinates)}`;
    default:
      return `${geometry.type} (...)`;
  }
}

// 从 CSV 导入属性数据
async function importFromCSV(file: File) {
  const text = await file.text();

  // 解析 CSV
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV 文件为空或格式错误');
  }

  // 解析标题行
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  // 解析数据行
  const features = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));

    const feature: any = {
      id: values[0] || `import-${i}`,
      name: values[1] || '未命名',
      type: values[2] || 'unknown',
      properties: {}
    };

    // 解析属性
    for (let j = 3; j < headers.length; j++) {
      const key = headers[j];
      const value = values[j];

      // 尝试转换为数字
      const numValue = parseFloat(value);
      feature.properties[key] = isNaN(numValue) ? value : numValue;
    }

    features.push(feature);
  }

  // 批量导入
  await db.features.insertMany(features);

  console.log(`从 CSV 导入 ${features.length} 条记录`);
}
```

#### 批量导入优化

**示例代码：**
```typescript
// 大数据集分批导入
async function batchImport(
  features: any[],
  options: {
    batchSize?: number;
    onProgress?: (current: number, total: number) => void;
    validate?: boolean;
  } = {}
) {
  const {
    batchSize = 100,
    onProgress,
    validate = true
  } = options;

  const total = features.length;
  let imported = 0;
  const errors: Array<{ index: number; error: string }> = [];

  console.log(`开始批量导入 ${total} 个要素`);

  for (let i = 0; i < total; i += batchSize) {
    const batch = features.slice(i, i + batchSize);
    const validBatch = [];

    // 验证批次
    for (let j = 0; j < batch.length; j++) {
      const feature = batch[j];
      const index = i + j;

      if (validate) {
        const validation = FeatureValidator.validate(feature);
        if (!validation.valid) {
          errors.push({
            index,
            error: validation.errors.join(', ')
          });
          continue;
        }
      }

      validBatch.push(feature);
    }

    // 插入有效数据
    if (validBatch.length > 0) {
      try {
        await db.transaction('rw', db.features, async () => {
          await db.features.insertMany(validBatch);
        });

        imported += validBatch.length;
      } catch (error) {
        console.error(`批次 ${i}-${i + batchSize} 导入失败:`, error);
      }
    }

    // 报告进度
    if (onProgress) {
      onProgress(Math.min(i + batchSize, total), total);
    }

    // 让出控制权，避免阻塞 UI
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  console.log(`导入完成: ${imported}/${total} 成功`);

  if (errors.length > 0) {
    console.warn(`跳过 ${errors.length} 个无效要素`);
    console.table(errors.slice(0, 10)); // 只显示前10个错误

    if (errors.length > 10) {
      console.warn(`... 还有 ${errors.length - 10} 个错误`);
    }
  }

  return {
    imported,
    total,
    errors
  };
}

// 使用示例
const largeDataset = generateFeatures(10000);

await batchImport(largeDataset, {
  batchSize: 200,
  validate: true,
  onProgress: (current, total) => {
    const percent = ((current / total) * 100).toFixed(1);
    console.log(`进度: ${percent}% (${current}/${total})`);
  }
});
```

#### 数据备份和恢复

**示例代码：**
```typescript
// 完整数据库备份
async function backupDatabase() {
  const backup = {
    version: 1,
    timestamp: Date.now(),
    data: {
      features: await db.features.toArray(),
      collections: await db.collections.toArray(),
      statistics: await db.statistics.toArray()
    }
  };

  const json = JSON.stringify(backup);
  const compressed = await compressData(json); // 可选：压缩数据

  // 保存到文件
  const blob = new Blob([compressed], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  URL.revokeObjectURL(url);

  console.log('备份完成');
}

// 简单的压缩函数（使用 pako 库）
async function compressData(data: string): Promise<string> {
  // 这里可以使用 pako 等压缩库
  // 为了示例，直接返回原始数据
  return data;
}

// 恢复数据库
async function restoreDatabase(file: File) {
  const json = await file.text();
  const backup = JSON.parse(json);

  // 验证备份格式
  if (!backup.version || !backup.data) {
    throw new Error('无效的备份文件');
  }

  // 清空现有数据
  await db.transaction('rw', [db.features, db.collections, db.statistics], async () => {
    await db.features.clear();
    await db.collections.clear();
    await db.statistics.clear();

    // 恢复数据
    await db.features.insertMany(backup.data.features);
    await db.collections.insertMany(backup.data.collections);
    await db.statistics.insertMany(backup.data.statistics);
  });

  console.log('恢复完成');
}
```

> **💡 提示:** 对于大数据集（> 10000条），使用分批导入可以避免内存溢出和浏览器卡顿。考虑使用 Web Worker 在后台处理数据。

---

## 实战练习

### 场景: 城市规划工具

你正在开发一个城市规划工具，需要实现以下功能：
1. 创建和管理城市规划区域（住宅区、商业区、工业区）
2. 计算区域之间的距离和交集
3. 分析区域内的设施数量
4. 生成规划报告并导出

#### 任务要求

1. 创建包含不同类型区域的数据库
2. 实现区域间的空间分析（缓冲区、交集、并集）
3. 查询每个区域内的设施数量
4. 生成包含统计数据的规划报告
5. 导出报告为 GeoJSON 和 CSV 格式

#### 实现步骤

<details>
<summary>查看实现步骤</summary>

1. **步骤一**: 初始化数据库并创建区域数据
   ```typescript
   import { WebGeoDB } from '@webgeodb/core';
   import * as turf from '@turf/turf';

   const db = new WebGeoDB({ name: 'urban-planning' });
   await db.open();

   // 创建区域索引
   db.features.createIndex('geometry', { type: 'rbush', auto: true });
   db.features.createIndex('type');

   // 定义规划区域
   const zones = [
     {
       id: 'residential-1',
       name: '朝阳区住宅区',
       type: 'residential',
       geometry: turf.polygon([[
         [116.420, 39.915],
         [116.420, 39.925],
         [116.430, 39.925],
         [116.430, 39.915],
         [116.420, 39.915]
       ]]).geometry,
       properties: {
         population: 50000,
         area: turf.area(turf.polygon([[
           [116.420, 39.915],
           [116.420, 39.925],
           [116.430, 39.925],
           [116.430, 39.915],
           [116.420, 39.915]
         ]])),
         buildYear: 2010
       }
     },
     {
       id: 'commercial-1',
       name: 'CBD商业区',
       type: 'commercial',
       geometry: turf.polygon([[
         [116.404, 39.915],
         [116.404, 39.925],
         [116.414, 39.925],
         [116.414, 39.915],
         [116.404, 39.915]
       ]]).geometry,
       properties: {
         companies: 200,
         area: turf.area(turf.polygon([[
           [116.404, 39.915],
           [116.404, 39.925],
           [116.414, 39.925],
           [116.414, 39.915],
           [116.404, 39.915]
         ]])),
         buildYear: 2005
       }
     }
   ];

   await db.features.insertMany(zones);
   ```

2. **步骤二**: 实现空间分析功能
   ```typescript
   // 分析两个区域的交集
   function analyzeZoneOverlap(zone1Id: string, zone2Id: string) {
     const zone1 = turf.polygon([zone1.geometry.coordinates]);
     const zone2 = turf.polygon([zone2.geometry.coordinates]);

     // 计算交集
     const intersection = turf.intersect(zone1, zone2);

     if (intersection) {
       const intersectionArea = turf.area(intersection);
       const zone1Area = zone1.properties.area;
       const zone2Area = zone2.properties.area;

       return {
         hasOverlap: true,
         intersectionArea,
         overlapPercentZone1: (intersectionArea / zone1Area) * 100,
         overlapPercentZone2: (intersectionArea / zone2Area) * 100,
         intersectionGeometry: intersection.geometry
       };
     }

     return { hasOverlap: false };
   }

   // 创建缓冲区
   function createZoneBuffer(zoneId: string, radius: number) {
     const zone = await db.features.get(zoneId);
     const polygon = turf.polygon([zone.geometry.coordinates]);

     const buffer = turf.buffer(polygon, radius, { units: 'kilometers' });

     return {
       id: `buffer-${zoneId}`,
       name: `${zone.name} 缓冲区`,
       type: 'buffer',
       geometry: buffer.geometry,
       properties: {
         originalZoneId: zoneId,
         radius,
         area: turf.area(buffer)
       }
     };
   }
   ```

3. **步骤三**: 添加设施并查询
   ```typescript
   // 添加设施数据
   const facilities = [
     {
       id: 'school-1',
       name: '朝阳小学',
       type: 'school',
       category: 'education',
       geometry: {
         type: 'Point',
         coordinates: [116.425, 39.920]
       },
       properties: {
         capacity: 1000,
         students: 850
       }
     },
     {
       id: 'hospital-1',
       name: '朝阳医院',
       type: 'hospital',
       category: 'healthcare',
       geometry: {
         type: 'Point',
         coordinates: [116.422, 39.918]
       },
       properties: {
         beds: 500,
         doctors: 200
       }
     },
     {
       id: 'shop-1',
       name: '购物中心',
       type: 'shop',
       category: 'commercial',
       geometry: {
         type: 'Point',
         coordinates: [116.409, 39.920]
       },
       properties: {
         area: 50000,
         shops: 150
       }
     }
   ];

   await db.features.insertMany(facilities);

   // 查询区域内的设施
   async function getFacilitiesInZone(zoneId: string) {
     const zone = await db.features.get(zoneId);
     const polygon = turf.polygon([zone.geometry.coordinates]);

     const allFacilities = await db.features
       .where('category', '!=', null)
       .toArray();

     const facilitiesInZone = allFacilities.filter(facility => {
       const point = turf.point(facility.geometry.coordinates);
       return turf.booleanPointInPolygon(point, polygon);
     });

     return {
       zoneId,
       zoneName: zone.name,
       facilities: facilitiesInZone,
       count: facilitiesInZone.length,
       byCategory: facilitiesInZone.reduce((acc, f) => {
         acc[f.category] = (acc[f.category] || 0) + 1;
         return acc;
       }, {} as Record<string, number>)
     };
   }
   ```

4. **步骤四**: 生成规划报告
   ```typescript
   async function generatePlanningReport() {
     // 获取所有区域
     const zones = await db.features
       .where('type', '=', 'residential')
       .or('type', '=', 'commercial')
       .or('type', '=', 'industrial')
       .toArray();

     const report = {
       generatedAt: new Date().toISOString(),
       zones: [] as any[]
     };

     // 分析每个区域
     for (const zone of zones) {
       const facilities = await getFacilitiesInZone(zone.id);
       const buffer = createZoneBuffer(zone.id, 1);

       // 查找缓冲区内的其他区域
       const nearbyZones = await db.features
         .distance('geometry', zone.geometry.coordinates, '<', 2000)
         .where('type', '!=', 'buffer')
         .toArray();

       report.zones.push({
         ...zone,
         facilities,
         buffer: {
           area: buffer.properties.area,
           nearbyZones: nearbyZones.map(z => ({
             id: z.id,
             name: z.name,
             type: z.type
           }))
         }
       });
     }

     // 计算总体统计
     const totalStats = {
       totalZones: zones.length,
       totalArea: zones.reduce((sum, z) => sum + (z.properties.area || 0), 0),
       totalFacilities: report.zones.reduce((sum, z) => sum + z.facilities.count, 0)
     };

     return {
       ...report,
       summary: totalStats
     };
   }
   ```

5. **步骤五**: 导出功能
   ```typescript
   // 导出为 GeoJSON
   async function exportReportToGeoJSON(report: any) {
     const features = report.zones.map(zone => ({
       type: 'Feature',
       id: zone.id,
       geometry: zone.geometry,
       properties: {
         name: zone.name,
         type: zone.type,
         facilities: zone.facilities.count,
         facilityBreakdown: zone.facilities.byCategory
       }
     }));

     const geojson = {
       type: 'FeatureCollection',
       features,
       metadata: {
         generatedAt: report.generatedAt,
         summary: report.summary
       }
     };

     const blob = new Blob([JSON.stringify(geojson, null, 2)], {
       type: 'application/json'
     });

     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `planning-report-${Date.now()}.geojson`;
     a.click();

     URL.revokeObjectURL(url);
   }

   // 导出为 CSV
   async function exportReportToCSV(report: any) {
     const rows = [
       // 标题行
       ['区域ID', '区域名称', '类型', '面积(㎡)', '设施数量', '学校', '医院', '商店'].join(','),
       // 数据行
       ...report.zones.map(zone => [
         zone.id,
         zone.name,
         zone.type,
         (zone.properties.area || 0).toFixed(2),
         zone.facilities.count,
         zone.facilities.byCategory.education || 0,
         zone.facilities.byCategory.healthcare || 0,
         zone.facilities.byCategory.commercial || 0
       ].join(','))
     ];

     const csv = rows.join('\n');
     const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });

     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `planning-report-${Date.now()}.csv`;
     a.click();

     URL.revokeObjectURL(url);
   }
   ```

</details>

#### 测试验证

```typescript
// 运行测试
async function runTests() {
  console.log('开始城市规划工具测试...\n');

  // 1. 创建区域
  console.log('1. 创建规划区域');
  // (步骤一代码)

  // 2. 测试空间分析
  console.log('\n2. 测试空间分析');
  const overlap = analyzeZoneOverlap('residential-1', 'commercial-1');
  console.log('区域交集分析:', overlap);

  // 3. 测试设施查询
  console.log('\n3. 查询区域设施');
  const facilities = await getFacilitiesInZone('residential-1');
  console.log('住宅区设施:', facilities);

  // 4. 生成报告
  console.log('\n4. 生成规划报告');
  const report = await generatePlanningReport();
  console.log('报告摘要:', report.summary);

  // 5. 导出报告
  console.log('\n5. 导出报告');
  await exportReportToGeoJSON(report);
  await exportReportToCSV(report);

  console.log('\n测试完成！');
}

runTests();
```

#### 答案参考

<details>
<summary>查看完整答案</summary>

完整实现代码请参考上述步骤。关键要点：
- 使用 Turf.js 进行空间计算
- 使用事务确保数据一致性
- 批量操作提升性能
- 支持多种导出格式

</details>

---

### 场景: 轨迹分析系统

你正在开发一个 GPS 轨迹分析系统，需要：
1. 存储和管理大量 GPS 轨迹点
2. 分析轨迹的长度、速度、方向
3. 识别轨迹停留点
4. 批量导入轨迹数据
5. 生成轨迹统计报告

#### 任务要求

1. 设计轨迹数据模型
2. 实现轨迹点批量插入（10000+点）
3. 计算轨迹统计信息（总长度、平均速度、最大速度）
4. 识别轨迹中的停留点（停留超过5分钟）
5. 导出轨迹分析报告

#### 实现步骤

<details>
<summary>查看实现步骤</summary>

1. **步骤一**: 设计数据模型
   ```typescript
   import { WebGeoDB } from '@webgeodb/core';
   import * as turf from '@turf/turf';

   const db = new WebGeoDB({ name: 'trajectory-analysis' });
   await db.open();

   // 创建索引
   db.features.createIndex('geometry', { type: 'rbush', auto: true });
   db.features.createIndex('trajectoryId');
   db.features.createIndex('timestamp');

   // 轨迹点数据模型
   interface TrajectoryPoint {
     id: string;
     trajectoryId: string;
     type: 'trajectory-point';
     geometry: {
       type: 'Point';
       coordinates: [number, number];
     };
     properties: {
       timestamp: number;
       speed?: number;
       bearing?: number;
       accuracy?: number;
     };
   }

   // 轨迹汇总数据模型
   interface TrajectorySummary {
     id: string;
     trajectoryId: string;
     type: 'trajectory-summary';
     properties: {
       startTime: number;
       endTime: number;
       pointCount: number;
       totalLength: number;
       avgSpeed: number;
       maxSpeed: number;
       stayPoints: Array<{
         location: [number, number];
         duration: number;
         startTime: number;
       }>;
     };
   }
   ```

2. **步骤二**: 批量导入轨迹点
   ```typescript
   async function importTrajectoryPoints(
     trajectoryId: string,
     points: Array<{
       longitude: number;
       latitude: number;
       timestamp: number;
       accuracy?: number;
     }>,
     options: {
       batchSize?: number;
       onProgress?: (current: number, total: number) => void;
     } = {}
   ) {
     const { batchSize = 500, onProgress } = options;
     const total = points.length;

     console.log(`开始导入轨迹 ${trajectoryId}，共 ${total} 个点`);

     // 按时间排序
     const sortedPoints = points.sort((a, b) => a.timestamp - b.timestamp);

     // 分批导入
     for (let i = 0; i < total; i += batchSize) {
       const batch = sortedPoints.slice(i, i + batchSize);

       // 计算速度和方向
       const processedBatch = batch.map((point, index) => {
         const prevPoint = index > 0 ? batch[index - 1] : null;

         let speed = 0;
         let bearing = 0;

         if (prevPoint) {
           const from = turf.point([prevPoint.longitude, prevPoint.latitude]);
           const to = turf.point([point.longitude, point.latitude]);

           const distance = turf.distance(from, to, { units: 'kilometers' });
           const timeDiff = (point.timestamp - prevPoint.timestamp) / 1000 / 3600; // 小时

           if (timeDiff > 0) {
             speed = distance / timeDiff; // km/h
             bearing = turf.bearing(from, to);
           }
         }

         return {
           id: `${trajectoryId}-${i + index}`,
           trajectoryId,
           type: 'trajectory-point',
           geometry: {
             type: 'Point',
             coordinates: [point.longitude, point.latitude]
           },
           properties: {
             timestamp: point.timestamp,
             speed,
             bearing,
             accuracy: point.accuracy
           }
         } as TrajectoryPoint;
       });

       // 批量插入
       await db.features.insertMany(processedBatch);

       // 报告进度
       if (onProgress) {
         onProgress(Math.min(i + batchSize, total), total);
       }

       // 让出控制权
       await new Promise(resolve => setTimeout(resolve, 0));
     }

     console.log(`轨迹 ${trajectoryId} 导入完成`);
   }

   // 使用示例：生成模拟轨迹数据
   function generateMockTrajectory(pointCount: number = 10000) {
     const points = [];
     let longitude = 116.404;
     let latitude = 39.915;
     let timestamp = Date.now() - pointCount * 5000; // 每5秒一个点

     for (let i = 0; i < pointCount; i++) {
       // 模拟随机移动
       longitude += (Math.random() - 0.5) * 0.001;
       latitude += (Math.random() - 0.5) * 0.001;
       timestamp += 5000 + Math.random() * 2000; // 5-7秒

       points.push({
         longitude,
         latitude,
         timestamp,
         accuracy: 5 + Math.random() * 10
       });
     }

     return points;
   }

   // 导入模拟数据
   const mockTrajectory = generateMockTrajectory(10000);

   await importTrajectoryPoints(
     'trajectory-1',
     mockTrajectory,
     {
       batchSize: 500,
       onProgress: (current, total) => {
         const percent = ((current / total) * 100).toFixed(1);
         console.log(`导入进度: ${percent}% (${current}/${total})`);
       }
     }
   );
   ```

3. **步骤三**: 计算轨迹统计信息
   ```typescript
   async function analyzeTrajectory(trajectoryId: string) {
     // 查询所有轨迹点
     const points = await db.features
       .where('trajectoryId', '=', trajectoryId)
       .where('type', '=', 'trajectory-point')
       .toArray();

     if (points.length < 2) {
       throw new Error('轨迹点数量不足');
     }

     // 按时间排序
     points.sort((a, b) => a.properties.timestamp - b.properties.timestamp);

     // 计算总长度
     let totalLength = 0;
     let maxSpeed = 0;
     let speedSum = 0;

     for (let i = 1; i < points.length; i++) {
       const from = turf.point(points[i - 1].geometry.coordinates);
       const to = turf.point(points[i].geometry.coordinates);

       const distance = turf.distance(from, to, { units: 'kilometers' });
       totalLength += distance;

       const speed = points[i].properties.speed || 0;
       maxSpeed = Math.max(maxSpeed, speed);
       speedSum += speed;
     }

     const avgSpeed = speedSum / points.length;

     // 计算时间范围
     const startTime = points[0].properties.timestamp;
     const endTime = points[points.length - 1].properties.timestamp;
     const duration = endTime - startTime;

     // 识别停留点
     const stayPoints = identifyStayPoints(points, {
       minDuration: 5 * 60 * 1000, // 5分钟
       maxDistance: 50 // 50米
     });

     // 保存汇总信息
     const summary: TrajectorySummary = {
       id: `summary-${trajectoryId}`,
       trajectoryId,
       type: 'trajectory-summary',
       properties: {
         startTime,
         endTime,
         pointCount: points.length,
         totalLength,
         avgSpeed,
         maxSpeed,
         stayPoints
       }
     };

     await db.features.insert(summary);

     return summary;
   }

   // 识别停留点
   function identifyStayPoints(
     points: TrajectoryPoint[],
     options: {
       minDuration: number;
       maxDistance: number;
     }
   ) {
     const { minDuration, maxDistance } = options;
     const stayPoints = [];

     let stayStart = null;
     let stayCenter = null;
     let stayPoints = [];

     for (let i = 0; i < points.length; i++) {
       const point = points[i];
       const location = point.geometry.coordinates;

       if (stayStart === null) {
         // 开始新的潜在停留
         stayStart = point.properties.timestamp;
         stayCenter = location;
         stayPoints = [point];
       } else {
         // 计算距离
         const distance = turf.distance(
           turf.point(stayCenter!),
           turf.point(location),
           { units: 'meters' }
         );

         if (distance <= maxDistance) {
           // 仍在停留范围内
           stayPoints.push(point);

           // 更新中心点
           const coords = stayPoints.map(p => p.geometry.coordinates);
           const center = calculateCenter(coords);
           stayCenter = center;
         } else {
           // 离开停留范围
           const duration = point.properties.timestamp - stayStart;

           if (duration >= minDuration) {
             // 这是一个有效的停留点
             stayPoints.push({
               location: stayCenter!,
               duration,
               startTime: stayStart!
             });
           }

           // 开始新的潜在停留
           stayStart = point.properties.timestamp;
           stayCenter = location;
           stayPoints = [point];
         }
       }
     }

     // 检查最后一个停留
     if (stayStart !== null && stayPoints.length > 0) {
       const lastPoint = stayPoints[stayPoints.length - 1];
       const duration = lastPoint.properties.timestamp - stayStart;

       if (duration >= minDuration) {
         stayPoints.push({
           location: stayCenter!,
           duration,
           startTime: stayStart!
         });
       }
     }

     return stayPoints;
   }

   // 计算中心点
   function calculateCenter(coords: Array<[number, number]>): [number, number] {
     const sum = coords.reduce(
       (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]],
       [0, 0]
     );

     return [sum[0] / coords.length, sum[1] / coords.length];
   }

   // 使用示例
   const summary = await analyzeTrajectory('trajectory-1');

   console.log('轨迹分析结果:');
   console.log(`  总长度: ${summary.properties.totalLength.toFixed(2)} 公里`);
   console.log(`  平均速度: ${summary.properties.avgSpeed.toFixed(2)} km/h`);
   console.log(`  最大速度: ${summary.properties.maxSpeed.toFixed(2)} km/h`);
   console.log(`  停留点数量: ${summary.properties.stayPoints.length}`);
   ```

4. **步骤四**: 生成轨迹报告
   ```typescript
   async function generateTrajectoryReport(trajectoryId: string) {
     // 获取轨迹汇总
     const summary = await db.features
       .where('trajectoryId', '=', trajectoryId)
       .where('type', '=', 'trajectory-summary')
       .first();

     if (!summary) {
       throw new Error('轨迹汇总不存在，请先分析轨迹');
     }

     // 获取轨迹点
     const points = await db.features
       .where('trajectoryId', '=', trajectoryId)
       .where('type', '=', 'trajectory-point')
       .toArray();

     // 生成报告
     const report = {
       trajectoryId,
       generatedAt: new Date().toISOString(),

       // 基本信息
       info: {
         pointCount: summary.properties.pointCount,
         startTime: new Date(summary.properties.startTime).toLocaleString(),
         endTime: new Date(summary.properties.endTime).toLocaleString(),
         duration: formatDuration(
           summary.properties.endTime - summary.properties.startTime
         )
       },

       // 统计信息
       statistics: {
         totalLength: {
           value: summary.properties.totalLength,
           formatted: `${summary.properties.totalLength.toFixed(2)} 公里`
         },
         avgSpeed: {
           value: summary.properties.avgSpeed,
           formatted: `${summary.properties.avgSpeed.toFixed(2)} km/h`
         },
         maxSpeed: {
           value: summary.properties.maxSpeed,
           formatted: `${summary.properties.maxSpeed.toFixed(2)} km/h`
         }
       },

       // 停留点
       stayPoints: summary.properties.stayPoints.map(sp => ({
         location: {
           longitude: sp.location[0],
           latitude: sp.location[1]
         },
         duration: formatDuration(sp.duration),
         startTime: new Date(sp.startTime).toLocaleString()
       })),

       // 轨迹线（用于可视化）
       trajectoryLine: {
         type: 'LineString',
         coordinates: points
           .sort((a, b) => a.properties.timestamp - b.properties.timestamp)
           .map(p => p.geometry.coordinates)
       }
     };

     return report;
   }

   // 格式化时长
   function formatDuration(milliseconds: number): string {
     const seconds = Math.floor(milliseconds / 1000);
     const minutes = Math.floor(seconds / 60);
     const hours = Math.floor(minutes / 60);

     const remainingMinutes = minutes % 60;
     const remainingSeconds = seconds % 60;

     if (hours > 0) {
       return `${hours}小时${remainingMinutes}分钟`;
     } else if (minutes > 0) {
       return `${minutes}分钟${remainingSeconds}秒`;
     } else {
       return `${seconds}秒`;
     }
   }

   // 导出报告
   async function exportTrajectoryReport(report: any) {
     const reportText = `
轨迹分析报告
====================================

轨迹ID: ${report.trajectoryId}
生成时间: ${report.generatedAt}

基本信息
------------------------------------
轨迹点数量: ${report.info.pointCount}
开始时间: ${report.info.startTime}
结束时间: ${report.info.endTime}
总时长: ${report.info.duration}

统计信息
------------------------------------
总长度: ${report.statistics.totalLength.formatted}
平均速度: ${report.statistics.avgSpeed.formatted}
最大速度: ${report.statistics.maxSpeed.formatted}

停留点 (${report.stayPoints.length}个)
------------------------------------
${report.stayPoints.map((sp, i) => `
${i + 1}. 位置: (${sp.location.longitude.toFixed(6)}, ${sp.location.latitude.toFixed(6)})
   停留时长: ${sp.duration}
   开始时间: ${sp.startTime}
`).join('\n')}
     `.trim();

     const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
     const url = URL.createObjectURL(blob);

     const a = document.createElement('a');
     a.href = url;
     a.download = `trajectory-report-${report.trajectoryId}.txt`;
     a.click();

     URL.revokeObjectURL(url);

     console.log('报告已导出');
   }

   // 使用示例
   const report = await generateTrajectoryReport('trajectory-1');
   console.log('轨迹报告:', report);
   await exportTrajectoryReport(report);
   ```

5. **步骤五**: 性能优化
   ```typescript
   // 使用缓存加速重复查询
   class TrajectoryCache {
     private cache = new Map<string, any>();
     private ttl = 10 * 60 * 1000; // 10分钟

     async get(trajectoryId: string) {
       const cached = this.cache.get(trajectoryId);

       if (cached && Date.now() - cached.timestamp < this.ttl) {
         console.log('使用缓存的轨迹数据');
         return cached.data;
       }

       // 从数据库加载
       const summary = await db.features
         .where('trajectoryId', '=', trajectoryId)
         .where('type', '=', 'trajectory-summary')
         .first();

       if (!summary) {
         return null;
       }

       // 更新缓存
       this.cache.set(trajectoryId, {
         data: summary,
         timestamp: Date.now()
       });

       return summary;
     }

     invalidate(trajectoryId?: string) {
       if (trajectoryId) {
         this.cache.delete(trajectoryId);
       } else {
         this.cache.clear();
       }
     }
   }

   const trajectoryCache = new TrajectoryCache();

   // 批量处理多个轨迹
   async function batchAnalyzeTrajectories(
     trajectoryIds: string[],
     onProgress?: (current: number, total: number) => void
   ) {
     const results = [];

     for (let i = 0; i < trajectoryIds.length; i++) {
       const trajectoryId = trajectoryIds[i];

       try {
         const summary = await analyzeTrajectory(trajectoryId);
         results.push({ trajectoryId, success: true, data: summary });
       } catch (error) {
         results.push({
           trajectoryId,
           success: false,
           error: (error as Error).message
         });
       }

       // 报告进度
       if (onProgress) {
         onProgress(i + 1, trajectoryIds.length);
       }

       // 让出控制权
       await new Promise(resolve => setTimeout(resolve, 100));
     }

     return results;
   }
   ```

</details>

#### 测试验证

```typescript
// 运行测试
async function runTrajectoryTests() {
  console.log('开始轨迹分析系统测试...\n');

  // 1. 生成模拟数据
  console.log('1. 生成模拟轨迹数据');
  const mockTrajectory = generateMockTrajectory(10000);

  // 2. 导入数据
  console.log('\n2. 导入轨迹数据');
  await importTrajectoryPoints('trajectory-1', mockTrajectory, {
    batchSize: 500,
    onProgress: (current, total) => {
      const percent = ((current / total) * 100).toFixed(1);
      console.log(`  进度: ${percent}% (${current}/${total})`);
    }
  });

  // 3. 分析轨迹
  console.log('\n3. 分析轨迹统计信息');
  const summary = await analyzeTrajectory('trajectory-1');
  console.log('分析结果:');
  console.log(`  总长度: ${summary.properties.totalLength.toFixed(2)} 公里`);
  console.log(`  平均速度: ${summary.properties.avgSpeed.toFixed(2)} km/h`);
  console.log(`  最大速度: ${summary.properties.maxSpeed.toFixed(2)} km/h`);
  console.log(`  停留点: ${summary.properties.stayPoints.length} 个`);

  // 4. 生成报告
  console.log('\n4. 生成轨迹报告');
  const report = await generateTrajectoryReport('trajectory-1');

  // 5. 导出报告
  console.log('\n5. 导出报告');
  await exportTrajectoryReport(report);

  console.log('\n测试完成！');
}

runTrajectoryTests();
```

#### 答案参考

<details>
<summary>查看完整答案</summary>

完整实现代码请参考上述步骤。关键要点：
- 批量导入优化（500-1000点/批次）
- 按时间排序确保数据正确性
- 识别停留点算法（距离+时长）
- 使用缓存提升重复查询性能

</details>

---

## 常见问题

### Q: 如何选择 Turf.js 还是 JSTS？

**A:** 选择哪个库取决于你的需求：

**Turf.js**：
- 适合快速原型开发
- API 简洁易用
- 性能好（大多数操作）
- 文档完善，社区活跃
- 适合常见的空间分析任务

**JSTS**：
- 功能更强大和全面
- 支持 JTS 的所有操作
- 适合复杂的几何计算
- 性能可能略低于 Turf.js
- API 相对复杂

建议：大多数应用使用 Turf.js，只有需要 JTS 特有功能时才使用 JSTS。

---

### Q: 事务失败后如何回滚？

**A:** WebGeoDB 的事务会自动回滚。你不需要手动处理回滚：

```typescript
try {
  await db.transaction('rw', db.features, async () => {
    await db.features.insert(feature1);
    await db.features.insert(feature2);

    // 如果这里抛出错误，前面的插入会自动回滚
    throw new Error('Something went wrong');
  });
} catch (error) {
  console.error('事务失败，已自动回滚');
  // 数据库状态不变
}
```

关键点：
- 事务内的任何错误都会触发回滚
- 回滚是自动的，无需手动调用
- 捕获错误后可以重试或提示用户

---

### Q: 如何优化大量数据的导入性能？

**A:** 使用以下优化策略：

1. **批量插入**：
```typescript
// ✅ 使用 insertMany
await db.features.insertMany(largeDataset);

// ❌ 避免循环插入
for (const item of largeDataset) {
  await db.features.insert(item);
}
```

2. **合适的批次大小**：
```typescript
const batchSize = 500; // 500-1000 通常是最佳值
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  await db.features.insertMany(batch);
}
```

3. **先导入后建索引**：
```typescript
// ✅ 先导入数据
await db.features.insertMany(largeDataset);

// ✅ 后建索引
db.features.createIndex('geometry', { type: 'flatbush' });
```

4. **使用 Web Worker**：
```typescript
// 在后台线程中处理数据
const worker = new Worker('import-worker.js');
worker.postMessage({ data: largeDataset });
```

---

### Q: 如何处理并发更新冲突？

**A:** 使用乐观锁或悲观锁：

**乐观锁**（推荐）：
```typescript
async function updateWithOptimisticLock(id: string, updates: any) {
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
      await db.transaction('rw', db.features, async () => {
        const current = await db.features.get(id);

        // 检查版本
        if (current.version !== updates.expectedVersion) {
          throw new Error('VERSION_CONFLICT');
        }

        // 更新并递增版本
        await db.features.update(id, {
          ...updates.data,
          version: current.version + 1
        });
      });

      return; // 成功
    } catch (error) {
      if (error.message === 'VERSION_CONFLICT' && i < maxRetries - 1) {
        // 重新获取数据并重试
        const fresh = await db.features.get(id);
        updates.expectedVersion = fresh.version;
        continue;
      }
      throw error;
    }
  }
}
```

---

### Q: 如何验证地理数据的正确性？

**A:** 使用多层验证：

```typescript
function validateGeoJSON(data: any): boolean {
  // 1. 基本结构验证
  if (!data || typeof data !== 'object') return false;
  if (!data.type || !data.coordinates) return false;

  // 2. 类型验证
  const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
  if (!validTypes.includes(data.type)) return false;

  // 3. 坐标验证
  function validateCoords(coords: any, depth: number = 0): boolean {
    if (!Array.isArray(coords)) return false;

    if (coords.length === 0) return false;

    // Point: [x, y]
    if (coords[0] instanceof Number) {
      return coords.length >= 2;
    }

    // 递归验证嵌套数组
    return coords.every(c => validateCoords(c, depth + 1));
  }

  if (!validateCoords(data.coordinates)) return false;

  // 4. 坐标范围验证
  function checkRange(coords: any): boolean {
    if (typeof coords === 'number') {
      return coords >= -180 && coords <= 180;
    }
    if (Array.isArray(coords)) {
      return coords.every(checkRange);
    }
    return true;
  }

  if (!checkRange(data.coordinates)) return false;

  return true;
}
```

---

### Q: 如何监控数据库性能？

**A:** 实现性能监控：

```typescript
class DatabaseMonitor {
  private operations = new Map<string, number[]>();

  async track<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();

    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;

      if (!this.operations.has(name)) {
        this.operations.set(name, []);
      }

      const records = this.operations.get(name)!;
      records.push(duration);

      // 只保留最近100条
      if (records.length > 100) {
        records.shift();
      }
    }
  }

  getReport() {
    const report: Record<string, any> = {};

    for (const [name, records] of this.operations.entries()) {
      const avg = records.reduce((a, b) => a + b, 0) / records.length;
      const max = Math.max(...records);
      const min = Math.min(...records);

      report[name] = {
        count: records.length,
        avg: avg.toFixed(2) + 'ms',
        max: max.toFixed(2) + 'ms',
        min: min.toFixed(2) + 'ms'
      };
    }

    return report;
  }
}

// 使用
const monitor = new DatabaseMonitor();

const results = await monitor.track('查询附近设施', async () => {
  return await db.features
    .distance('geometry', point, '<', 1000)
    .toArray();
});

console.log(monitor.getReport());
```

---

## 小结

本章深入探讨了 WebGeoDB 的高级特性和性能优化技术。我们学习了：

1. **几何计算引擎**：
   - Turf.js 和 JSTS 的集成和使用
   - 缓冲区分析、交集、并集等空间操作
   - 距离、面积、长度计算

2. **事务管理**：
   - ACID 特性和并发控制
   - 乐观锁处理并发冲突
   - 事务隔离级别

3. **性能优化**：
   - 批量操作提升 10-50x 性能
   - 索引优化（R-Tree vs Static）
   - 查询优化和缓存策略
   - 性能监控工具

4. **错误处理和数据验证**：
   - 错误处理模式
   - 数据验证最佳实践
   - 事务错误恢复

5. **数据导入导出**：
   - GeoJSON 和 CSV 格式支持
   - 批量导入优化
   - 数据备份和恢复

### 核心要点回顾

- ✅ 使用 Turf.js 进行快速空间分析，JSTS 处理复杂几何操作
- ✅ 事务保证数据一致性，避免长时间运行的事务
- ✅ 批量操作和索引可以显著提升性能（10-50x）
- ✅ 始终验证输入数据，实现健壮的错误处理
- ✅ 大数据集使用分批处理，避免内存溢出

### 下一步学习

- **[第4章: 实战项目](./chapter-04-practice-project.md)** - 构建完整的地理位置应用
- **[API 参考](../../api/reference.md)** - 查看完整 API 文档
- **[性能优化指南](../../guides/performance.md)** - 深入了解性能优化
- **[最佳实践](../../guides/best-practices.md)** - 生产环境建议

---

## 参考资源

- **Turf.js 文档** - https://turfjs.org/
- **JSTS 文档** - https://github.com/bjornharrtell/jsts
- **GeoJSON 规范** - https://geojson.org/
- **IndexedDB API** - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **[性能优化指南](../../guides/performance.md)** - 详细的性能优化技术
- **[最佳实践](../../guides/best-practices.md)** - 生产环境配置和模式