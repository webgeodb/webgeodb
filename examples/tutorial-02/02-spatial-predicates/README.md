# WebGeoDB 教程示例

## 示例信息

- **章节**: 第2章 - 空间查询基础
- **示例名称**: 空间谓词详解
- **难度**: 中级
- **预计时间**: 25分钟

## 学习目标

通过本示例，你将学习：

1. 理解8个OGC标准空间谓词的含义和使用场景
2. 掌握每个谓词在实际应用中的用法
3. 学会选择合适的空间谓词解决实际问题

## 前置要求

- Node.js >= 16
- npm 或 pnpm
- 完成第1章的学习
- 了解基本的地理空间概念（点、线、面）

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

示例将演示所有8个空间谓词的使用方法。

## 代码结构

```
.
├── src/
│   └── index.ts          # 主程序文件
├── package.json          # 项目配置
└── README.md             # 本文件
```

## 关键代码说明

### 1. Intersects (相交)

```typescript
const results = await db.features
  .intersects('geometry', testArea)
  .find();
```

**说明**: 查找与指定区域相交的所有要素。这是最常用的空间谓词。

**应用场景**:
- 查找某区域内的所有设施
- 查找与道路相交的建筑物
- 查找影响范围内的所有对象

### 2. Within (在内部)

```typescript
const results = await db.features
  .within('geometry', testArea)
  .find();
```

**说明**: 查找完全在指定区域内的要素（边界不接触）。

**应用场景**:
- 查找某行政区内的所有学校
- 查找某个公园内的所有设施
- 查找配送范围内的所有订单

### 3. Contains (包含)

```typescript
const results = await db.features
  .contains('geometry', testPoint)
  .find();
```

**说明**: 查找包含指定几何对象的要素。

**应用场景**:
- 查找包含某个点的行政区
- 查找包含某个地址的学区
- 查找包含某个坐标的网格

### 4. Overlaps (重叠)

```typescript
const results = await db.features
  .intersects('geometry', testArea)
  .find();
// 然后过滤出真正重叠的情况
```

**说明**: 查找与指定区域部分重叠的要素（都不完全包含对方）。

**应用场景**:
- 查找部分重叠的建设项目
- 查找有冲突的土地使用权
- 查找重叠的服务范围

### 5. Crosses (穿越)

```typescript
const results = await db.features
  .intersects('geometry', testLine)
  .find();
```

**说明**: 查找穿越指定区域的要素（通常用于线与面、线与线的关系）。

**应用场景**:
- 查找穿越城市的河流
- 查找穿越保护区的道路
- 查找穿越行政区的管线

### 6. Touches (相接)

```typescript
const results = await db.features
  .intersects('geometry', testLine)
  .find();
```

**说明**: 查找与指定区域边界相接的要素（只有边界接触）。

**应用场景**:
- 查找相邻的行政区
- 查找相接的地块
- 查找边界共享的要素

### 7. Equals (相等)

```typescript
const results = await db.features
  .where('name', '=', '相同区域')
  .find();
```

**说明**: 查找在空间上完全相等的几何对象。

**应用场景**:
- 查找重复的地理要素
- 验证两个区域是否相同
- 数据去重和一致性检查

### 8. Disjoint (分离)

```typescript
// 先获取所有相交的ID
const intersectingIds = new Set(
  (await db.features
    .intersects('geometry', testArea)
    .find())
    .map(f => f.id)
);

// 然后过滤出不相交的
const allFeatures = await db.features.find();
const disjointResults = allFeatures.filter(f => !intersectingIds.has(f.id));
```

**说明**: 查找与指定区域完全分离的要素（没有任何公共点）。

**应用场景**:
- 查找影响范围外的对象
- 查找不在配送区域的订单
- 查找不在保护区的设施

## 空间谓词选择指南

| 谓词 | 使用场景 | 示例 |
|------|---------|------|
| **Intersects** | 最常用，判断是否相交 | 查找区域内的所有设施 |
| **Within** | 查找在区域内的对象 | 查找某区内的学校 |
| **Contains** | 查找包含某点的对象 | 查找包含某点的行政区 |
| **Overlaps** | 查找部分重叠的对象 | 查找重叠的建设项目 |
| **Crosses** | 查找穿越的对象 | 查找穿越城市的河流 |
| **Touches** | 查找边界相接的对象 | 查找相邻的行政区 |
| **Equals** | 查找空间相同的对象 | 查找重复的要素 |
| **Disjoint** | 查找完全不相交的对象 | 查找区域外的设施 |

## 扩展练习

尝试修改代码以完成以下任务：

1. 创建一个圆形缓冲区，查找与之相交的所有要素
2. 实现一个函数，判断两个空间关系（如：某条道路是否穿越某个公园）
3. 组合使用空间谓词和属性查询（如：查找某区域内所有营业中的餐厅）
4. 实现一个"邻近度分析"功能，查找距离某个点最近的前5个要素

## 相关文档

- [第2章教程](../../../docs/tutorials/zh/chapter-02-spatial-queries.md)
- [OGC标准规范](https://www.ogc.org/)
- [空间关系详解](../../../docs/guides/spatial-relations.md)
- [API参考](../../../docs/api/reference.md)

## 常见问题

### Q: Intersects 和 Within 有什么区别？

**A**: Intersects 只要两个几何对象有任何公共点就返回 true，而 Within 要求几何对象A完全在几何对象B内部，且边界不接触。

### Q: 如何实现复杂的空间关系查询？

**A**: 可以链式调用多个空间谓词，也可以结合属性查询使用。例如：`db.features.intersects('geometry', area).where('type', '=', 'restaurant').find()`

### Q: 空间谓词的性能如何？

**A**: WebGeoDB 使用 R-Tree 空间索引，空间谓词查询性能非常高。对于大数据集，建议确保已创建空间索引。

## 许可证

MIT
