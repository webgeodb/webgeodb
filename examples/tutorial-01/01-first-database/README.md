# WebGeoDB 教程示例

## 示例信息

- **章节**: 第1章 - 快速入门
- **示例名称**: 创建第一个数据库
- **难度**: 初级
- **预计时间**: 10分钟

## 学习目标

通过本示例，你将学习：

1. WebGeoDB 的基本概念和架构
2. 如何创建和初始化数据库实例
3. 如何定义表结构（Schema）
4. 如何创建空间索引以优化查询性能

## 前置要求

- Node.js >= 16
- npm 或 pnpm
- 基础的 TypeScript 知识

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
章节: 第1章 - 快速入门
示例: 创建第一个数据库

步骤 1: 创建数据库实例...
✅ 数据库实例创建成功

步骤 2: 定义表结构...
✅ 表结构定义成功

步骤 3: 打开数据库...
✅ 数据库打开成功

步骤 4: 创建空间索引...
✅ 空间索引创建成功

步骤 5: 验证表结构...
✅ 表结构验证成功

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
├── tsconfig.json         # TypeScript 配置
└── README.md             # 本文件
```

## 关键代码说明

### 创建数据库实例

```typescript
const db = new WebGeoDB({
  name: 'tutorial-01-first-database',
  version: 1
});
```

**说明**: 创建一个 WebGeoDB 实例，指定数据库名称和版本。数据库将存储在浏览器的 IndexedDB 中（浏览器环境）或文件系统中（Node.js 环境）。

### 定义表结构

```typescript
db.schema({
  features: {
    id: 'string',
    name: 'string',
    type: 'string',
    geometry: 'geometry',
    properties: 'json',
    createdAt: 'datetime'
  }
});
```

**说明**: 定义数据表的结构。WebGeoDB 支持多种数据类型：
- `string`: 字符串
- `number`: 数字
- `boolean`: 布尔值
- `geometry`: GeoJSON 几何对象（Point, LineString, Polygon 等）
- `json`: JSON 对象
- `datetime`: 日期时间

### 打开数据库

```typescript
await db.open();
```

**说明**: 打开数据库连接。这是一个异步操作，需要使用 `await` 等待完成。

### 创建空间索引

```typescript
db.features.createIndex('geometry', { auto: true });
```

**说明**: 为 `geometry` 字段创建空间索引。空间索引使用 R-tree 数据结构，可以大幅提升空间查询的性能（如距离查询、相交查询等）。设置 `auto: true` 表示每次插入数据时自动更新索引。

## 核心概念

### 1. 数据库（Database）

WebGeoDB 数据库是地理空间数据的容器，类似于传统的 SQL 数据库。每个数据库有一个唯一的名称和版本号。

### 2. 表（Table/Table Collection）

表是存储特定类型数据的集合。在地理空间应用中，通常使用 `features` 表来存储地理要素（Features）。

### 3. 索引（Index）

索引用于加速查询。WebGeoDB 支持两种类型的索引：
- **属性索引**: 基于字段值的标准索引
- **空间索引**: 基于 R-tree 的空间索引，用于加速空间查询

### 4. GeoJSON

WebGeoDB 使用 GeoJSON 格式存储地理空间数据：
- **Point**: 点（如商店位置）
- **LineString**: 线（如道路）
- **Polygon**: 面（如公园、建筑物）

## 扩展练习

尝试修改代码以完成以下任务：

1. 修改数据库名称为 `my-first-geodb`
2. 添加一个新字段 `updatedAt` 到表结构中
3. 为 `type` 字段创建一个普通索引
4. 尝试修改数据库版本号为 2，观察会发生什么

## 相关文档

- [第1章教程](../../../docs/tutorials/zh/chapter-01-quickstart.md)
- [API参考](../../../docs/api/reference.md)
- [数据模型指南](../../../docs/guides/data-model.md)

## 常见问题

### Q: 为什么要创建索引？

**A:** 索引可以大幅提升查询性能。对于包含大量地理空间数据的应用，空间索引是必需的。没有索引的查询需要扫描所有数据，而有索引的查询只需要检查相关的数据项。

### Q: 数据库存储在哪里？

**A:** 在浏览器环境中，数据存储在 IndexedDB 中；在 Node.js 环境中，数据存储在文件系统中。具体位置取决于运行环境。

### Q: 版本号有什么用？

**A:** 版本号用于数据库升级。当你需要修改表结构时，可以增加版本号，WebGeoDB 会自动处理数据迁移。

## 下一步

完成本示例后，继续学习：
- [02-basic-crud](../02-basic-crud/): 学习 CRUD 操作
- [03-place-markers](../03-place-markers/): 构建实际应用

## 许可证

MIT
