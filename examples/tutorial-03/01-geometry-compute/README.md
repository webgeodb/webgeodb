# WebGeoDB 教程示例 - 第3章: 几何计算

## 示例简介

本示例展示如何使用 WebGeoDB 进行高级几何计算，包括距离、面积、长度计算，以及缓冲区分析、交集、并集等空间操作。

## 学习目标

1. 掌握 Turf.js 与 WebGeoDB 的集成方法
2. 学会计算两点间距离、路径长度
3. 理解面积计算的应用场景
4. 掌握缓冲区分析的用法
5. 学会几何对象的交集、并集操作
6. 了解中心点和边界框的计算

## 前置要求

- Node.js >= 16
- TypeScript >= 4.5
- 完成第1-2章的学习

## 安装和运行

```bash
# 安装依赖
npm install

# 运行示例
npm start

# 编译TypeScript
npm run build
```

## 示例内容

### 1. 距离计算

使用 Turf.js 计算两点间的直线距离：

```typescript
import * as turf from '@turf/turf';

// 计算距离
const from = turf.point([116.397477, 39.909187]);
const to = turf.point([116.397026, 39.918058]);
const distance = turf.distance(from, to, { units: 'kilometers' }) * 1000;
console.log(`距离: ${distance.toFixed(2)} 米`);
```

### 2. 面积计算

计算多边形区域的面积：

```typescript
// 计算面积
const area = turf.area(polygon);
console.log(`面积: ${area.toFixed(2)} 平方米`);
```

### 3. 缓冲区分析

创建指定半径的缓冲区：

```typescript
// 创建500米缓冲区
const point = turf.point([116.397477, 39.909187]);
const buffer = turf.buffer(point, 0.5, { units: 'kilometers' });
const bufferArea = turf.area(buffer);
```

### 4. 交集操作

查找两个几何对象的交集：

```typescript
const intersection = turf.intersect(polygon1, polygon2);
if (intersection) {
  const area = turf.area(intersection);
  console.log(`交集面积: ${area} 平方米`);
}
```

### 5. 并集操作

合并多个几何对象：

```typescript
const union = turf.union(polygon1, polygon2);
const unionArea = turf.area(union);
```

### 6. 中心点计算

计算几何对象的中心点：

```typescript
const centroid = turf.centroid(polygon);
const [lon, lat] = centroid.geometry.coordinates;
```

### 7. 边界框计算

计算几何对象的边界框：

```typescript
const bbox = turf.bbox(geometry);
const [minLon, minLat, maxLon, maxLat] = bbox;
```

## 实际应用场景

### 地理围栏

- 检查用户是否在指定区域内
- 计算到目的地的距离
- 查找附近的兴趣点

### 区域分析

- 计算商圈覆盖范围
- 分析服务区域
- 规划配送范围

### 空间查询

- 查找相交的区域
- 合并多个区域
- 计算区域之间的距离

## 性能指标

本示例中的性能测试数据：

- 距离计算: < 1ms
- 面积计算: < 1ms
- 缓冲区创建: 1-5ms
- 交集计算: 5-20ms（取决于几何复杂度）
- 并集计算: 5-30ms（取决于几何复杂度）

## 注意事项

1. **坐标系统**: Turf.js 使用 GeoJSON 格式，坐标顺序为 [经度, 纬度]
2. **单位选择**: 距离计算支持多种单位（kilometers, miles, degrees）
3. **精度考虑**: 测地线计算比欧几里得距离更准确
4. **性能优化**: 复杂几何操作可能耗时，考虑使用 Web Worker

## 相关资源

- [Turf.js 官方文档](http://turfjs.org/)
- [GeoJSON 规范](https://geojson.org/)
- [WebGeoDB API 文档](../../docs/api.md)

## 下一步

- 学习第3章示例2: 事务管理
- 学习第3章示例3: 性能优化
- 查看更多实战案例
