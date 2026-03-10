# WebGeoDB 教程示例

## 示例信息

- **章节**: 第1章 - 快速入门
- **示例名称**: 个人地点标记系统
- **难度**: 初级
- **预计时间**: 20分钟
- **应用场景**: 咖啡店探索应用

## 学习目标

通过本示例，你将学习：

1. 如何将 CRUD 操作应用到实际场景
2. 掌握空间查询（距离查询、附近搜索）
3. 构建一个完整的地点标记应用
4. 学习业务逻辑与数据操作的结合

## 应用场景

这是一个咖啡店探索应用，用户可以：
- ☕ 添加喜欢的咖啡店位置
- 🔍 查找附近的咖啡店
- ⭐ 更新店铺评分和评论
- 🗑️ 删除已关闭的店铺
- 📊 查看统计信息

## 前置要求

- Node.js >= 16
- npm 或 pnpm
- 完成前面章节的学习
- 完成 [01-first-database](../01-first-database/) 和 [02-basic-crud](../02-basic-crud/) 示例

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 运行示例

```bash
npm start
```

### 3. 查看输出

示例将演示一个完整的咖啡店探索应用，包括：
- 添加5家咖啡店
- 查找2公里范围内的咖啡店
- 查找高评分咖啡店
- 查找提供WiFi的咖啡店
- 更新店铺评分
- 删除已关闭的店铺
- 显示统计信息

## 代码结构

```
.
├── src/
│   └── index.ts          # 主程序文件
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
└── README.md             # 本文件
```

## 关键代码说明

### 数据类型定义

```typescript
interface Cafe {
  id: string;
  name: string;
  type: string;
  address: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    category: string;
    rating: number;
    priceRange: string;
    wifi: boolean;
    notes?: string;
  };
  createdAt: Date;
}
```

**说明**: 定义咖啡店的数据结构，包含位置信息（geometry）和属性信息（properties）。

### 距离计算

```typescript
function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371e3; // 地球半径（米）
  // Haversine 公式计算两点之间的距离
  // ...
  return distance;
}
```

**说明**: 使用 Haversine 公式计算地球表面两点之间的距离。

### 空间查询 - 附近搜索

```typescript
const nearbyCafes = await db.features
  .distance('geometry', center, '<', radius)
  .where('type', '=', 'cafe')
  .toArray();
```

**说明**: 使用 `distance()` 方法查找指定半径范围内的地点。参数：
- `geometry`: 空间字段名
- `center`: 中心点坐标 [经度, 纬度]
- `<`: 比较操作符
- `radius`: 半径（米）

### 复合条件查询

```typescript
const wifiCafes = await db.features
  .where('type', '=', 'cafe')
  .where('properties.wifi', '=', true)
  .toArray();
```

**说明**: 可以组合多个条件查询。这里查找类型为 `cafe` 且提供 WiFi 的地点。

### 排序查询

```typescript
const topRatedCafes = await db.features
  .where('type', '=', 'cafe')
  .where('properties.rating', '>=', 4.5)
  .orderBy('properties.rating', 'desc')
  .toArray();
```

**说明**: 使用 `orderBy()` 对结果排序。`desc` 表示降序（从高到低）。

### 更新数据

```typescript
async function updateCafeRating(
  db: WebGeoDB,
  cafeId: string,
  newRating: number
): Promise<void> {
  const cafe = await db.features.get(cafeId);
  if (!cafe) {
    throw new Error(`咖啡店 ${cafeId} 不存在`);
  }

  await db.features.update(cafeId, {
    properties: {
      ...cafe.properties,
      rating: newRating
    }
  });
}
```

**说明**: 更新数据时，先检查记录是否存在，然后更新指定字段。

### 删除数据

```typescript
async function deleteCafe(db: WebGeoDB, cafeId: string): Promise<boolean> {
  const cafe = await db.features.get(cafeId);
  if (!cafe) {
    console.log(`咖啡店 ${cafeId} 不存在`);
    return false;
  }

  await db.features.delete(cafeId);
  console.log(`已删除: ${cafe.name}`);
  return true;
}
```

**说明**: 删除数据前先检查记录是否存在，避免错误。

### 统计和聚合

```typescript
const totalCount = await db.features.count();
const cafeCount = await db.features
  .where('type', '=', 'cafe')
  .count();

// 计算平均评分
const cafes = await db.features
  .where('type', '=', 'cafe')
  .toArray();
const avgRating =
  cafes.reduce((sum, cafe) => sum + (cafe.properties.rating || 0), 0) /
  cafes.length;
```

**说明**: 使用 `count()` 统计记录数量，使用 `reduce()` 计算平均值。

## 应用架构

```
┌─────────────────────────────────────┐
│     用户界面 (UI)                   │
│  - 添加咖啡店                        │
│  - 查找附近咖啡店                    │
│  - 更新评分                          │
│  - 删除咖啡店                        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     业务逻辑层 (Service)            │
│  - addCafe()                        │
│  - findNearbyCafes()                │
│  - updateCafeRating()               │
│  - deleteCafe()                     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     数据访问层 (Repository)         │
│  - WebGeoDB API                     │
│  - CRUD 操作                        │
│  - 空间查询                         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     数据存储层 (Storage)            │
│  - IndexedDB (浏览器)               │
│  - 文件系统 (Node.js)               │
└─────────────────────────────────────┘
```

## 扩展功能

基于本示例，你可以添加以下功能：

1. **用户评价系统**
   - 添加用户评论
   - 记录访问历史
   - 收藏功能

2. **高级搜索**
   - 按价格范围筛选
   - 按营业时间筛选
   - 多条件组合查询

3. **地图展示**
   - 集成地图组件（Leaflet、Mapbox）
   - 显示咖啡店位置标记
   - 路径规划

4. **社交功能**
   - 分享咖啡店
   - 查看朋友推荐
   - 评论互动

## 扩展练习

尝试修改代码以完成以下任务：

1. 添加"营业时间"字段，并实现查找当前营业中的咖啡店
2. 实现"按价格范围筛选"功能（$、$$、$$$）
3. 添加"最后访问时间"字段，并显示最近访问的咖啡店
4. 实现"推荐算法"：根据用户偏好推荐咖啡店
5. 添加"照片"字段，存储咖啡店照片URL
6. 实现批量导入功能（从JSON文件导入咖啡店数据）

## 性能优化建议

1. **创建索引**
   ```typescript
   db.features.createIndex('geometry', { auto: true });
   db.features.createIndex('type');
   db.features.createIndex('properties.rating');
   ```

2. **限制返回数量**
   ```typescript
   .limit(20)  // 只返回前20条结果
   ```

3. **使用分页**
   ```typescript
   .offset(page * pageSize)
   .limit(pageSize)
   ```

4. **缓存结果**
   - 缓存常用的查询结果
   - 使用定时更新策略

## 常见问题

### Q: 如何处理大量数据？

**A:** 使用分页查询，避免一次性加载所有数据：
```typescript
const page1 = await db.features
  .where('type', '=', 'cafe')
  .offset(0)
  .limit(20)
  .toArray();
```

### Q: 如何实现模糊搜索？

**A:** WebGeoDB 暂不支持 LIKE 查询。可以在获取数据后使用 JavaScript 的 `filter()`：
```typescript
const cafes = await db.features.toArray();
const filtered = cafes.filter(cafe =>
  cafe.name.includes('星巴克')
);
```

### Q: 如何处理并发更新？

**A:** 使用乐观锁或版本号：
```typescript
interface Cafe {
  id: string;
  version: number;  // 版本号
  // ...
}

// 更新时检查版本号
const cafe = await db.features.get(id);
await db.features.update(id, {
  ...cafe,
  version: cafe.version + 1
});
```

### Q: 如何实现地理位置围栏？

**A:** 使用 `distance()` 查询结合多边形相交查询：
```typescript
// 圆形围栏
const inside = await db.features
  .distance('geometry', center, '<', radius)
  .toArray();

// 多边形围栏
const polygon = {
  type: 'Polygon',
  coordinates: [[/* ... */]]
};
const inside = await db.features
  .intersects('geometry', polygon)
  .toArray();
```

## 相关文档

- [第1章教程](../../../docs/tutorials/zh/chapter-01-quickstart.md)
- [空间查询指南](../../../docs/guides/spatial-queries.md)
- [距离计算公式](https://en.wikipedia.org/wiki/Haversine_formula)

## 下一步

完成本示例后，继续学习：
- [第2章教程](../../../docs/tutorials/zh/chapter-02-spatial-queries.md): 空间查询和地理分析
- [第3章教程](../../../docs/tutorials/zh/chapter-03-advanced-queries.md): 高级查询和性能优化
- 查看更多专题应用示例

## 许可证

MIT
