# 第2章示例 - 空间查询基础

本章节包含3个完整的示例项目，帮助你掌握 WebGeoDB 的空间查询功能。

## 示例列表

### 1. 属性查询进阶
**路径**: `01-property-queries/`

**学习内容**:
- 多条件组合查询（AND 逻辑）
- 嵌套属性访问和查询
- 排序和分页功能
- 构建复杂查询条件

**适用场景**:
- 数据筛选和过滤
- 列表展示和排序
- 分页浏览

**运行方式**:
```bash
cd 01-property-queries
npm install
npm start
```

### 2. 空间谓词详解
**路径**: `02-spatial-predicates/`

**学习内容**:
- 8个OGC标准空间谓词的使用
- 每个谓词的含义和应用场景
- 空间关系判断
- 实际应用中的谓词选择

**适用场景**:
- 空间关系分析
- 地理信息系统
- 空间数据查询

**运行方式**:
```bash
cd 02-spatial-predicates
npm install
npm start
```

### 3. 房地产搜索应用
**路径**: `03-real-estate-app/`

**学习内容**:
- 组合使用空间查询和属性查询
- 距离查询和范围查询
- 多条件搜索功能实现
- 结果排序和分页
- 数据统计和分析

**适用场景**:
- 房地产搜索
- 附近位置查找
- 区域内的对象查询

**运行方式**:
```bash
cd 03-real-estate-app
npm install
npm start
```

## 学习路径

建议按以下顺序学习：

1. **先学习 `01-property-queries`**
   - 理解基本的查询构建
   - 掌握条件组合和排序分页
   - 为空间查询打基础

2. **再学习 `02-spatial-predicates`**
   - 理解各种空间谓词的含义
   - 学习空间关系的判断
   - 掌握空间查询的基本方法

3. **最后学习 `03-real-estate-app`**
   - 综合运用前面所学的知识
   - 理解实际应用场景
   - 学习完整的搜索功能实现

## 技术要点

### 空间查询

```typescript
// 相交查询
const results = await db.features
  .intersects('geometry', searchArea)
  .find();

// 在内部查询
const results = await db.features
  .within('geometry', searchArea)
  .find();

// 包含查询
const results = await db.features
  .contains('geometry', searchPoint)
  .find();
```

### 属性查询

```typescript
// 单条件查询
const results = await db.features
  .where('type', '=', '餐厅')
  .find();

// 多条件组合
const results = await db.features
  .where('type', '=', '餐厅')
  .where('rating', '>=', 4.0)
  .find();

// 嵌套属性
const results = await db.features
  .where('properties.isOpen', '=', true)
  .find();
```

### 排序和分页

```typescript
// 排序
const results = await db.features
  .orderBy('rating', 'desc')
  .find();

// 分页
const results = await db.features
  .limit(10)
  .offset(20)
  .find();
```

### 组合查询

```typescript
const results = await db.features
  .intersects('geometry', searchArea)
  .where('status', '=', '在售')
  .where('price', '<=', 5000000)
  .orderBy('price', 'asc')
  .limit(10)
  .find();
```

## 常见问题

### Q: 如何选择合适的空间谓词？

**A**:
- **Intersects**: 最常用，判断是否相交
- **Within**: 查找在区域内的对象
- **Contains**: 查找包含某点的对象
- 其他谓词根据具体需求选择

### Q: 如何提高查询性能？

**A**:
- 确保创建了空间索引
- 使用合理的查询条件
- 避免返回过多数据
- 使用分页控制结果数量

### Q: 如何实现复杂的查询逻辑？

**A**:
- 链式调用多个条件
- 在应用层合并多次查询结果
- 使用排序和分页优化用户体验

## 相关文档

- [第2章教程](../../docs/tutorials/zh/chapter-02-spatial-queries.md)
- [查询构建器API](../../docs/api/query-builder.md)
- [空间索引指南](../../docs/guides/spatial-index.md)

## 下一步

完成本章学习后，可以继续学习：

- **第3章**: 高级空间查询（空间连接、聚合查询）
- **第4章**: 性能优化（索引策略、查询优化）
- **第5章**: 实战项目（完整的地理应用）

## 许可证

MIT
