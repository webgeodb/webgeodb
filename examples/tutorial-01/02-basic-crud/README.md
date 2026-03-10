# WebGeoDB 教程示例

## 示例信息

- **章节**: 第1章 - 快速入门
- **示例名称**: CRUD基础操作
- **难度**: 初级
- **预计时间**: 15分钟

## 学习目标

通过本示例，你将学习：

1. 如何插入数据（单条和批量）
2. 各种查询方法（单条查询、条件查询、排序、分页）
3. 数据更新和删除操作
4. 查询结果的统计和聚合

## 前置要求

- Node.js >= 16
- npm 或 pnpm
- 完成前面章节的学习
- 完成 [01-first-database](../01-first-database/) 示例

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

示例将演示完整的 CRUD 操作流程，包括：
- 插入单条和多条数据
- 各种查询方式
- 数据更新和删除
- 统计信息

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

### 插入单条数据

```typescript
const feature = {
  id: '1',
  name: '北京天安门',
  type: 'landmark',
  geometry: {
    type: 'Point',
    coordinates: [116.397428, 39.90923]
  },
  properties: {
    description: '中国的象征',
    rating: 5.0
  },
  createdAt: new Date()
};
await db.features.insert(feature);
```

**说明**: 使用 `insert()` 方法插入单条记录。数据必须符合定义的表结构。

### 批量插入数据

```typescript
const features = [
  { id: '2', name: '全聚德', /* ... */ },
  { id: '3', name: '星巴克', /* ... */ },
  { id: '4', name: '海底捞', /* ... */ }
];
await db.features.insertMany(features);
```

**说明**: 使用 `insertMany()` 方法批量插入数据，比多次调用 `insert()` 更高效。

### 单条查询

```typescript
const feature = await db.features.get('1');
```

**说明**: 通过主键（ID）获取单条记录。如果记录不存在，返回 `undefined`。

### 条件查询

```typescript
const restaurants = await db.features
  .where('type', '=', 'restaurant')
  .toArray();
```

**说明**: 使用 `where()` 方法进行条件查询。支持的操作符：
- `=`: 等于
- `!=`: 不等于
- `>`: 大于
- `<`: 小于
- `>=`: 大于等于
- `<=`: 小于等于

### 复杂条件查询

```typescript
const highRated = await db.features
  .where('properties.rating', '>', 4.5)
  .orderBy('properties.rating', 'desc')
  .toArray();
```

**说明**: 可以链式调用多个查询条件：
- `where()`: 添加过滤条件
- `orderBy()`: 排序（`asc` 或 `desc`）
- `offset()`: 跳过前N条
- `limit()`: 限制返回数量
- `toArray()`: 执行查询并返回数组

### 分页查询

```typescript
const page1 = await db.features
  .orderBy('createdAt', 'desc')
  .offset(0)
  .limit(10)
  .toArray();
```

**说明**: 使用 `offset()` 和 `limit()` 实现分页。`offset(0).limit(10)` 表示第1页，每页10条；`offset(10).limit(10)` 表示第2页。

### 统计查询

```typescript
const totalCount = await db.features.count();
const restaurantCount = await db.features
  .where('type', '=', 'restaurant')
  .count();
```

**说明**: 使用 `count()` 方法统计记录数量。可以结合 `where()` 进行条件统计。

### 更新数据

```typescript
await db.features.update('1', {
  properties: {
    visitors: 1000000
  }
});
```

**说明**: 使用 `update()` 方法更新指定ID的记录。只更新提供的字段，其他字段保持不变。

### 删除数据

```typescript
await db.features.delete('1');
```

**说明**: 使用 `delete()` 方法删除指定ID的记录。

## 查询链式操作

WebGeoDB 支持链式调用，可以组合多个操作：

```typescript
const results = await db.features
  .where('type', '=', 'restaurant')           // 条件1
  .where('properties.rating', '>', 4.0)       // 条件2
  .orderBy('properties.rating', 'desc')        // 排序
  .offset(0)                                   // 跳过
  .limit(10)                                   // 限制
  .toArray();                                  // 执行
```

## 执行顺序

链式操作的执行顺序：
1. **where()**: 添加过滤条件（可以多个）
2. **orderBy()**: 排序规则
3. **offset()**: 跳过前N条
4. **limit()**: 限制返回数量
5. **toArray() / count()**: 执行查询

## 数据类型

WebGeoDB 支持以下字段类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| `string` | 字符串 | `"北京天安门"` |
| `number` | 数字 | `4.5` |
| `boolean` | 布尔值 | `true` |
| `geometry` | GeoJSON几何对象 | `{ type: "Point", coordinates: [...] }` |
| `json` | JSON对象 | `{ category: "chinese", rating: 4.5 }` |
| `datetime` | 日期时间 | `new Date()` |

## 性能优化建议

1. **使用批量插入**: `insertMany()` 比多次 `insert()` 更快
2. **创建索引**: 为经常查询的字段创建索引
3. **限制返回数量**: 使用 `limit()` 避免返回过多数据
4. **使用条件查询**: 在数据库层面过滤，而不是在代码中过滤

## 扩展练习

尝试修改代码以完成以下任务：

1. 插入5个不同类型的地点（餐厅、咖啡店、公园、商场、地铁站）
2. 查询所有评分大于4.0的餐厅
3. 按创建时间倒序排列，获取前3条记录
4. 实现翻页功能（每页2条，显示第1页和第2页）
5. 更新某个地点的评分
6. 删除评分最低的地点

## 常见问题

### Q: where() 可以多次调用吗？

**A:** 可以。多次调用 `where()` 会添加 AND 条件。例如：
```typescript
.where('type', '=', 'restaurant')
.where('properties.rating', '>', 4.0)
```
表示查询类型为餐厅且评分大于4.0的记录。

### Q: 如何查询嵌套字段？

**A:** 使用点号访问嵌套字段：
```typescript
.where('properties.rating', '>', 4.0)
```

### Q: offset() 和 limit() 的顺序重要吗？

**A:** 不重要。但建议按照 `orderBy()` → `offset()` → `limit()` 的顺序书写，代码更清晰。

### Q: 如何实现模糊搜索？

**A:** WebGeoDB 暂不支持 LIKE 查询。可以在获取所有数据后，在代码中使用 `filter()` 和正则表达式进行模糊匹配。

## 相关文档

- [第1章教程](../../../docs/tutorials/zh/chapter-01-quickstart.md)
- [API参考 - CRUD操作](../../../docs/api/crud.md)
- [查询语法指南](../../../docs/guides/query-syntax.md)

## 下一步

完成本示例后，继续学习：
- [03-place-markers](../03-place-markers/): 构建实际应用

## 许可证

MIT
