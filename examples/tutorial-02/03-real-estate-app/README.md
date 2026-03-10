# WebGeoDB 教程示例

## 示例信息

- **章节**: 第2章 - 空间查询基础
- **示例名称**: 房地产搜索应用
- **难度**: 中级
- **预计时间**: 30分钟

## 学习目标

通过本示例，你将学习：

1. 如何在实际应用中组合使用空间查询和属性查询
2. 如何实现距离查询和范围查询
3. 如何构建复杂的多条件搜索功能
4. 如何实现结果排序和分页
5. 如何进行数据统计和分析

## 前置要求

- Node.js >= 16
- npm 或 pnpm
- 完成第1章和第2章前面示例的学习

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

示例将演示5个常见的房地产搜索场景。

## 代码结构

```
.
├── src/
│   └── index.ts          # 主程序文件
├── package.json          # 项目配置
└── README.md             # 本文件
```

## 关键代码说明

### 场景 1: 查找指定区域内的房源

```typescript
const cbdArea = createCircleArea([116.4074, 39.9042], 500); // 500米范围

const results = await db.properties
  .intersects('geometry', cbdArea)
  .where('status', '=', '在售')
  .orderBy('price', 'asc')
  .find();
```

**说明**: 使用 `intersects` 查找与指定区域相交的房源，并结合属性条件过滤。

### 场景 2: 查找距离地铁站一定范围内的房源

```typescript
const searchArea = createCircleArea(SUBWAY_STATIONS['建国门站'], 500);

const results = await db.properties
  .intersects('geometry', searchArea)
  .where('status', '=', '在售')
  .orderBy('price', 'asc')
  .find();

// 计算实际距离
const distance = calculateDistance(
  SUBWAY_STATIONS['建国门站'],
  property.geometry.coordinates
);
```

**说明**: 创建圆形搜索区域，查找地铁站附近的房源。

### 场景 3: 多条件组合查询

```typescript
const results = await db.properties
  .where('type', '=', '公寓')
  .where('rooms', '>=', 2)
  .where('rooms', '<=', 3)
  .where('price', '>=', 3000000)
  .where('price', '<=', 6000000)
  .where('area', '>=', 80)
  .where('area', '<=', 120)
  .where('status', '=', '在售')
  .orderBy('price', 'asc')
  .find();
```

**说明**: 链式调用多个 `where` 方法实现复杂的多条件查询。

### 场景 4: 查找附近房源并按距离排序

```typescript
const results = await db.properties
  .intersects('geometry', searchArea)
  .where('status', '=', '在售')
  .find();

// 手动计算距离并排序
const resultsWithDistance = results.map(property => ({
  ...property,
  distance: calculateDistance(centerPoint, property.geometry.coordinates)
})).sort((a, b) => a.distance - b.distance);
```

**说明**: 先查询范围内的房源，然后在应用层计算距离并排序。

### 场景 5: 分页浏览房源列表

```typescript
const pageSize = 3;
const pageNumber = 1;

const results = await db.properties
  .where('type', '=', '公寓')
  .where('status', '=', '在售')
  .orderBy('price', 'desc')
  .limit(pageSize)
  .offset((pageNumber - 1) * pageSize)
  .find();
```

**说明**: 使用 `limit` 和 `offset` 实现分页功能。

## 工具函数

### 格式化价格

```typescript
function formatPrice(price: number): string {
  if (price >= 10000) {
    return `${(price / 10000).toFixed(0)}万`;
  }
  return `${price}元`;
}
```

### 计算距离

```typescript
function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const dx = (coord1[0] - coord2[0]) * 111000;
  const dy = (coord1[1] - coord2[1]) * 111000;
  return Math.sqrt(dx * dx + dy * dy);
}
```

### 创建圆形搜索区域

```typescript
function createCircleArea(
  center: [number, number],
  radiusInMeters: number
): any {
  const delta = radiusInMeters / 111000;
  return {
    type: 'Polygon',
    coordinates: [[
      [center[0] - delta, center[1] - delta],
      [center[0] - delta, center[1] + delta],
      [center[0] + delta, center[1] + delta],
      [center[0] + delta, center[1] - delta],
      [center[0] - delta, center[1] - delta]
    ]]
  };
}
```

## 扩展练习

尝试修改代码以完成以下任务：

1. 实现一个"学区房搜索"功能，查找所有 `nearSchool` 为 true 的房源
2. 添加价格筛选功能，支持用户输入最低和最高价格
3. 实现一个"地图浏览"功能，在指定范围内显示所有房源
4. 添加"收藏"功能，允许用户保存喜欢的房源
5. 实现一个"价格趋势分析"功能，统计不同区域的价格分布

## 实际应用建议

1. **性能优化**: 对于大量数据，建议创建复合索引
2. **用户体验**: 添加加载动画和错误处理
3. **数据验证**: 验证用户输入的价格范围、面积等参数
4. **缓存策略**: 缓存热门查询的结果
5. **地图集成**: 与地图库（如 Leaflet、Mapbox）集成显示房源位置

## 相关文档

- [第2章教程](../../../docs/tutorials/zh/chapter-02-spatial-queries.md)
- [查询构建器文档](../../../docs/api/query-builder.md)
- [空间索引文档](../../../docs/guides/spatial-index.md)
- [API参考](../../../docs/api/reference.md)

## 常见问题

### Q: 如何实现更精确的圆形搜索？

**A**: 示例中使用方形近似圆形。如需更精确的圆形，可以使用地理空间库（如 Turf.js）创建真正的圆形缓冲区。

### Q: 如何处理大量数据的分页？

**A**: 使用 `limit` 和 `offset` 实现服务端分页，避免一次性加载所有数据。同时考虑使用游标分页提高性能。

### Q: 如何实现"附近房源"的实时更新？

**A**: 可以结合 WebSocket 实现实时推送新房源，或者使用定时轮询机制。

### Q: 如何优化距离计算的性能？

**A**: 对于大量数据，可以先使用粗略的边界框过滤，然后对候选结果进行精确的距离计算。

## 许可证

MIT
