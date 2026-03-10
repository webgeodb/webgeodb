# WebGeoDB 教程示例

## 示例信息

- **章节**: 第2章 - 空间查询基础
- **示例名称**: 属性查询进阶
- **难度**: 初级
- **预计时间**: 15分钟

## 学习目标

通过本示例，你将学习：

1. 如何使用多个条件组合查询（AND 逻辑）
2. 如何访问和查询嵌套属性（如 `properties.isOpen`）
3. 如何使用 `orderBy`、`limit` 和 `offset` 实现排序和分页
4. 如何构建复杂的查询条件

## 前置要求

- Node.js >= 16
- npm 或 pnpm
- 完成第1章的学习

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

示例将输出以下内容：

```
=== WebGeoDB 教程示例 ===
章节: 第2章 - 空间查询基础
示例: 属性查询进阶

步骤 1: 创建数据库实例...
✅ 数据库实例创建成功

步骤 2: 定义表结构...
✅ 表结构定义成功

步骤 3: 打开数据库...
✅ 数据库打开成功

步骤 4: 创建空间索引...
✅ 空间索引创建成功

步骤 5: 插入测试数据...
✅ 测试数据插入成功 (6 条记录)

示例 1: 多条件组合查询
查找类型为'餐厅'且评分>=4.0的场所
✅ 查询成功
找到 1 个结果:
  - 美味餐厅 (餐厅): 评分 4.5

示例 2: 嵌套属性查询
查找营业中的场所
✅ 查询成功
找到 4 个结果:
  - 美味餐厅: 营业中
  - 星空咖啡馆: 营业中
  - 购物中心: 营业中
  - 街角小吃: 营业中

示例 3: 排序和分页
按评分降序排列，获取前3个结果
✅ 查询成功
找到 3 个结果:
  1. 购物中心: 评分 4.7
  2. 艺术画廊: 评分 4.6
  3. 美味餐厅: 评分 4.5

示例 4: 复杂查询构建
查找营业中、类型为餐厅或咖啡馆、评分>=4.0的场所
✅ 查询成功
找到 2 个结果:
  - 美味餐厅 (餐厅): 评分 4.5, 营业中
  - 星空咖啡馆 (咖啡馆): 评分 4.2, 营业中

示例 5: 使用分页获取所有结果
每页2条记录，获取第2页
✅ 查询成功
第 2页，每页 2 条:
  1. 艺术画廊: 评分 4.6
  2. 美味餐厅: 评分 4.5

清理: 关闭数据库...
✅ 数据库已关闭

=== 示例执行完成 ===
```

## 代码结构

```
.
├── src/
│   └── index.ts          # 主程序文件
├── package.json          # 项目配置
└── README.md             # 本文件
```

## 关键代码说明

### 多条件组合查询

```typescript
const result = await db.places
  .where('type', '=', '餐厅')
  .where('rating', '>=', 4.0)
  .find();
```

**说明**: 链式调用 `where()` 方法会自动使用 AND 逻辑组合所有条件。

### 嵌套属性查询

```typescript
const result = await db.places
  .where('properties.isOpen', '=', true)
  .find();
```

**说明**: 使用点号（`.`）访问嵌套对象的属性，支持任意深度的嵌套。

### 排序和分页

```typescript
const result = await db.places
  .orderBy('rating', 'desc')
  .limit(3)
  .find();
```

**说明**:
- `orderBy(field, direction)`: 按字段排序，方向可以是 'asc'（升序）或 'desc'（降序）
- `limit(n)`: 限制返回结果数量
- `offset(n)`: 跳过前 n 条结果，用于分页

### 分页实现

```typescript
const pageSize = 2;
const pageNumber = 2;

const result = await db.places
  .orderBy('rating', 'desc')
  .limit(pageSize)
  .offset((pageNumber - 1) * pageSize)
  .find();
```

**说明**: 计算公式为 `offset = (pageNumber - 1) * pageSize`。

## 扩展练习

尝试修改代码以完成以下任务：

1. 查找所有评分在 4.0 到 4.5 之间的场所（提示：使用两个 where 条件）
2. 按创建时间升序排列所有场所
3. 实现一个函数，传入页码和每页数量，返回对应页的数据
4. 查找所有包含特定标签（如 '咖啡'）的场所

## 相关文档

- [第2章教程](../../../docs/tutorials/zh/chapter-02-spatial-queries.md)
- [API参考](../../../docs/api/reference.md)
- [查询构建器文档](../../../docs/api/query-builder.md)

## 常见问题

### Q: 如何实现 OR 条件查询？

**A**: 当前版本的查询构建器主要支持 AND 逻辑。如需 OR 条件，可以执行多次查询然后在应用层合并结果，如示例4所示。

### Q: 可以按嵌套属性排序吗？

**A**: 可以。使用 `orderBy('properties.isOpen', 'asc')` 即可按嵌套属性排序。

### Q: 如何查询数组中包含某个值的记录？

**A**: 对于数组字段（如 `properties.tags`），可以使用 `where('properties.tags', '=', '咖啡')` 来查询包含该值的记录。

## 许可证

MIT
