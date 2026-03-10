# 第1章: 快速上手入门

> **学习时间**: 30-45分钟 | **先决条件**: 无

## 学习目标

通过本章学习，你将能够：
- 理解 WebGeoDB 的核心概念和应用场景
- 安装和配置 WebGeoDB 开发环境
- 创建第一个空间数据库并定义表结构
- 掌握基础的 CRUD（增删改查）操作
- 理解 GeoJSON 几何类型和坐标系统基础
- 完成一个个人地点标记系统的实战练习

---

## 核心概念

### 1.1 什么是浏览器空间数据库？

**WebGeoDB** 是一个专为现代浏览器设计的轻量级空间数据库，它让前端开发者能够直接在浏览器中存储、查询和分析地理空间数据，无需依赖后端服务。

#### 核心特性

- 🪶 **轻量级**: 核心包小于 500KB，比 SQLite WASM 小 50%
- ⚡ **高性能**: 查询响应时间 < 1秒，支持 100MB-1GB 数据集
- 📱 **离线优先**: 基于 IndexedDB，完全支持离线使用
- 🌐 **跨平台**: 支持现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）
- 🔌 **可扩展**: 插件化架构，按需加载功能模块

#### 典型应用场景

1. **离线地图应用**
   - 离线地图瓦片缓存
   - 兴趣点（POI）管理
   - 路线规划和导航

2. **位置服务应用**
   - 实时位置追踪
   - 地理围栏和提醒
   - 附近的地点搜索

3. **数据分析工具**
   - 空间数据可视化
   - 区域统计和分析
   - 热力图生成

4. **协同编辑系统**
   - 多人地图标注
   - 空间数据协同编辑
   - 版本控制和同步

#### 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    应用层 (Application)                  │
│                    你的业务代码                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 查询层 (Query Engine)                    │
│  - 类 SQL 查询 API                                       │
│  - 链式查询 API (where, orderBy, limit)                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────┬──────────────────────────────────┐
│   空间索引 (Index)    │      几何计算 (Compute)          │
│  - rbush (动态)       │  - Turf.js 核心                  │
│  - flatbush (静态)    │  - JSTS (按需加载)               │
└──────────────────────┴──────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    存储层 (Storage)                      │
│           IndexedDB (通过 Dexie.js 封装)                │
└─────────────────────────────────────────────────────────┘
```

#### 关键要点

- **纯前端解决方案**: 无需后端服务器，降低架构复杂度
- **标准兼容**: 支持 GeoJSON、WKT 等国际标准格式
- **空间索引**: 内置 R-Tree 索引，大幅提升查询性能
- **易于集成**: 提供类 SQL 和链式两种 API，学习成本低

### 1.2 环境准备

#### 浏览器兼容性

WebGeoDB 支持所有现代浏览器：

| 浏览器 | 最低版本 | 说明 |
|--------|---------|------|
| Chrome | 90+ | ✅ 完全支持 |
| Firefox | 88+ | ✅ 完全支持 |
| Safari | 14+ | ✅ 完全支持 |
| Edge | 90+ | ✅ 完全支持 |

**检测浏览器支持**

```typescript
// 检查 IndexedDB 支持
if (!window.indexedDB) {
  console.error('您的浏览器不支持 IndexedDB');
}

// 检查 Web Worker 支持（用于并行计算）
if (!window.Worker) {
  console.warn('您的浏览器不支持 Web Worker，部分性能优化功能将不可用');
}
```

#### 安装 WebGeoDB

**使用 npm 安装**

```bash
# 使用 pnpm（推荐）
pnpm add @webgeodb/core

# 使用 npm
npm install @webgeodb/core

# 使用 yarn
yarn add @webgeodb/core
```

**TypeScript 配置**

如果你使用 TypeScript，确保 `tsconfig.json` 包含以下配置：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true
  }
}
```

#### 项目结构建议

推荐的项目目录结构：

```
your-project/
├── src/
│   ├── db/
│   │   ├── schema.ts        # 数据库表结构定义
│   │   ├── init.ts          # 数据库初始化
│   │   └── queries.ts       # 查询封装
│   ├── services/
│   │   └── location.ts      # 业务逻辑服务
│   └── app.ts               # 应用入口
├── package.json
└── tsconfig.json
```

> **💡 提示**: 将数据库相关代码放在独立的 `db/` 目录中，便于维护和测试。

### 1.3 创建第一个数据库

#### 初始化数据库实例

**示例代码:**

```typescript
import { WebGeoDB } from '@webgeodb/core';

// 创建数据库实例
const db = new WebGeoDB({
  name: 'my-first-geodb',     // 数据库名称
  version: 1                   // 数据库版本（用于升级管理）
});

// 定义表结构（Schema）
db.schema({
  places: {
    id: 'string',              // 主键
    name: 'string',            // 地点名称
    type: 'string',            // 地点类型
    geometry: 'geometry',      // 几何对象（GeoJSON）
    properties: 'json',        // 扩展属性（JSON 对象）
    rating: 'number',          // 评分（可选）
    createdAt: 'date'          // 创建时间（可选）
  }
});

// 打开数据库
await db.open();

console.log('数据库创建成功！');
```

**输出:**
```
数据库创建成功！
```

#### 表结构详解

**支持的数据类型**

| 类型 | 说明 | 示例 |
|------|------|------|
| `'string'` | 字符串 | `'北京市朝阳区'` |
| `'number'` | 数字 | `4.5`, `1000` |
| `'boolean'` | 布尔值 | `true`, `false` |
| `'date'` | 日期 | `new Date()` |
| `'array'` | 数组 | `[1, 2, 3]` |
| `'json'` | JSON 对象 | `{ rating: 4.5, tags: ['coffee'] }` |
| `'geometry'` | 几何对象 | GeoJSON 几何格式 |

**Schema 最佳实践**

```typescript
// ✅ 推荐：明确字段类型
db.schema({
  places: {
    id: 'string',
    name: 'string',
    geometry: 'geometry',
    properties: 'json'
  }
});

// ❌ 不推荐：过度嵌套
db.schema({
  places: {
    id: 'string',
    data: 'json'  // 把所有字段都放在 json 中，不利于索引
  }
});
```

> **💡 提示**: 为常用查询字段定义明确的类型，可以提升查询性能并简化代码。

#### 创建空间索引

空间索引是提升空间查询性能的关键：

```typescript
// 自动为 geometry 字段创建 R-Tree 索引
db.places.createIndex('geometry', { auto: true });

// 也可以手动指定索引字段
db.places.createIndex('type');  // 为 type 字段创建索引
```

**索引的作用**

- **加速空间查询**: 距离查询、相交查询等
- **加速属性查询**: where 条件过滤
- **自动维护**: 插入、更新、删除时自动更新索引

### 1.4 CRUD 基础操作

#### 插入数据（Create）

**单条插入**

```typescript
// 插入一个咖啡店位置
await db.places.insert({
  id: 'cafe-001',
  name: '星巴克（三里屯店）',
  type: 'coffee',
  geometry: {
    type: 'Point',
    coordinates: [116.4541, 39.9375]  // [经度, 纬度]
  },
  properties: {
    address: '北京市朝阳区三里屯路19号',
    phone: '010-12345678',
    tags: ['咖啡', 'WiFi', '外卖']
  },
  rating: 4.5,
  createdAt: new Date('2024-01-01')
});

console.log('数据插入成功');
```

**批量插入**

```typescript
// 批量插入多个地点
await db.places.insertMany([
  {
    id: 'cafe-002',
    name: '瑞幸咖啡（国贸店）',
    type: 'coffee',
    geometry: { type: 'Point', coordinates: [116.4589, 39.9087] },
    properties: { address: '北京市朝阳区建国门外大街1号' },
    rating: 4.2
  },
  {
    id: 'cafe-003',
    name: 'Costa Coffee（望京店）',
    type: 'coffee',
    geometry: { type: 'Point', coordinates: [116.4808, 39.9965] },
    properties: { address: '北京市朝阳区望京街9号' },
    rating: 4.6
  }
]);

console.log('批量插入成功');
```

#### 查询数据（Read）

**查询单条数据**

```typescript
// 通过 ID 查询
const place = await db.places.get('cafe-001');
console.log(place.name);  // 输出: 星巴克（三里屯店）
```

**查询所有数据**

```typescript
// 获取所有地点
const allPlaces = await db.places.toArray();
console.log(`总共 ${allPlaces.length} 个地点`);
```

**条件查询**

```typescript
// 查询所有咖啡店
const cafes = await db.places
  .where('type', '=', 'coffee')
  .toArray();

console.log('咖啡店列表:', cafes.map(p => p.name));
```

**多条件查询**

```typescript
// 查询评分大于 4.5 的咖啡店
const topCafes = await db.places
  .where('type', '=', 'coffee')
  .where('rating', '>', 4.5)
  .toArray();

console.log('高分咖啡店:', topCafes);
```

**排序和分页**

```typescript
// 按评分降序排列，取前 10 个
const topRated = await db.places
  .where('type', '=', 'coffee')
  .orderBy('rating', 'desc')
  .limit(10)
  .toArray();
```

#### 更新数据（Update）

```typescript
// 更新评分
await db.places.update('cafe-001', {
  rating: 4.8,
  properties: {
    // 更新嵌套属性
    ...place.properties,
    lastVisit: new Date().toISOString()
  }
});

console.log('数据更新成功');
```

#### 删除数据（Delete）

```typescript
// 删除单条数据
await db.places.delete('cafe-001');

// 批量删除
await db.places.deleteMany(['cafe-002', 'cafe-003']);

// 条件删除（先查询再删除）
const toDelete = await db.places
  .where('rating', '<', 3.0)
  .toArray();

await db.places.deleteMany(toDelete.map(p => p.id));
```

### 1.5 理解几何类型

WebGeoDB 使用 **GeoJSON** 标准格式表示几何对象。

#### GeoJSON 几何类型

**Point（点）**

表示一个位置，用于标记咖啡店、加油站、地铁站等。

```typescript
{
  type: 'Point',
  coordinates: [116.4541, 39.9375]  // [经度, 纬度]
}
```

**LineString（线）**

表示一条路径，用于表示道路、河流、路线等。

```typescript
{
  type: 'LineString',
  coordinates: [
    [116.4541, 39.9375],  // 起点
    [116.4589, 39.9087],  // 中间点
    [116.4808, 39.9965]   // 终点
  ]
}
```

**Polygon（面）**

表示一个区域，用于表示湖泊、建筑物、行政区划等。

```typescript
{
  type: 'Polygon',
  coordinates: [
    [
      [116.4541, 39.9375],  // 第一个点
      [116.4589, 39.9087],  // 第二个点
      [116.4808, 39.9965],  // 第三个点
      [116.4541, 39.9375]   // 闭合（与第一个点相同）
    ]
  ]
}
```

#### 坐标系统基础

**坐标格式**

GeoJSON 使用 `[经度, 纬度]` 格式，这与常见的 `[纬度, 经度]` 不同：

```typescript
// ✅ 正确：[经度, 纬度]
{ type: 'Point', coordinates: [116.4541, 39.9375] }

// ❌ 错误：[纬度, 经度]
{ type: 'Point', coordinates: [39.9375, 116.4541] }
```

**常用坐标系统**

| 坐标系 | 说明 | 适用场景 |
|--------|------|----------|
| WGS84 (EPSG:4326) | GPS 坐标，度为单位 | 全球地图应用 |
| GCJ02 | 中国国测局坐标 | 高德、腾讯地图 |
| BD09 | 百度坐标系 | 百度地图 |

> **💡 提示**: WebGeoDB 内部使用 WGS84 坐标系，如果你使用其他坐标系，需要进行转换。

#### 空间查询示例

**距离查询**

```typescript
// 查询当前位置 1km 范围内的咖啡店
const currentLocation = [116.4541, 39.9375];
const nearbyCafes = await db.places
  .distance('geometry', currentLocation, '<', 1000)  // 1000米
  .orderBy('distance')  // 按距离排序
  .toArray();

console.log('附近的咖啡店:', nearbyCafes);
```

**相交查询**

```typescript
// 查询与指定区域相交的地点
const searchArea = {
  type: 'Polygon',
  coordinates: [[
    [116.45, 39.93],
    [116.46, 39.93],
    [116.46, 39.94],
    [116.45, 39.94],
    [116.45, 39.93]
  ]]
};

const placesInArea = await db.places
  .intersects('geometry', searchArea)
  .toArray();
```

---

## 实战练习

### 场景: 个人地点标记系统

构建一个简单的个人地点标记系统，用于记录和管理你常去的咖啡店、餐厅、书店等地点。

#### 任务要求

1. **创建数据库**: 定义包含地点名称、类型、位置、评分的表结构
2. **添加数据**: 插入至少 3 个咖啡店和 2 个餐厅
3. **查询功能**:
   - 查找所有咖啡店
   - 查找评分大于 4.5 的地点
   - 按评分降序排列，显示前 5 个地点
4. **更新功能**: 更新某个地点的评分
5. **删除功能**: 删除一个已关闭的地点

#### 实现步骤

<details>
<summary>查看实现步骤</summary>

**步骤 1: 创建数据库和表结构**

```typescript
import { WebGeoDB } from '@webgeodb/core';

async function initDatabase() {
  const db = new WebGeoDB({
    name: 'personal-places',
    version: 1
  });

  db.schema({
    places: {
      id: 'string',
      name: 'string',
      type: 'string',
      geometry: 'geometry',
      properties: 'json',
      rating: 'number',
      createdAt: 'date'
    }
  });

  await db.open();
  db.places.createIndex('geometry', { auto: true });

  return db;
}
```

**步骤 2: 添加示例数据**

```typescript
async function seedData(db) {
  const places = [
    // 咖啡店
    {
      id: 'cafe-001',
      name: '星巴克（三里屯店）',
      type: 'coffee',
      geometry: { type: 'Point', coordinates: [116.4541, 39.9375] },
      properties: { address: '北京市朝阳区三里屯路19号' },
      rating: 4.5,
      createdAt: new Date()
    },
    {
      id: 'cafe-002',
      name: '瑞幸咖啡（国贸店）',
      type: 'coffee',
      geometry: { type: 'Point', coordinates: [116.4589, 39.9087] },
      properties: { address: '北京市朝阳区建国门外大街1号' },
      rating: 4.2,
      createdAt: new Date()
    },
    {
      id: 'cafe-003',
      name: 'Costa Coffee（望京店）',
      type: 'coffee',
      geometry: { type: 'Point', coordinates: [116.4808, 39.9965] },
      properties: { address: '北京市朝阳区望京街9号' },
      rating: 4.6,
      createdAt: new Date()
    },
    // 餐厅
    {
      id: 'restaurant-001',
      name: '海底捞（王府井店）',
      type: 'restaurant',
      geometry: { type: 'Point', coordinates: [116.4102, 39.9145] },
      properties: { address: '北京市东城区王府井大街255号' },
      rating: 4.8,
      createdAt: new Date()
    },
    {
      id: 'restaurant-002',
      name: '鼎泰丰（国贸店）',
      type: 'restaurant',
      geometry: { type: 'Point', coordinates: [116.4589, 39.9087] },
      properties: { address: '北京市朝阳区建国门外大街1号' },
      rating: 4.7,
      createdAt: new Date()
    }
  ];

  await db.places.insertMany(places);
  console.log('数据导入完成');
}
```

**步骤 3: 实现查询功能**

```typescript
async function queryExamples(db) {
  // 1. 查找所有咖啡店
  const cafes = await db.places
    .where('type', '=', 'coffee')
    .toArray();
  console.log('咖啡店列表:', cafes.map(p => p.name));

  // 2. 查找评分大于 4.5 的地点
  const topRated = await db.places
    .where('rating', '>', 4.5)
    .toArray();
  console.log('高分地点:', topRated.map(p => `${p.name} (${p.rating})`));

  // 3. 按评分降序排列，显示前 5 个
  const top5 = await db.places
    .orderBy('rating', 'desc')
    .limit(5)
    .toArray();
  console.log('Top 5 地点:', top5.map(p => `${p.name}: ${p.rating}`));
}
```

**步骤 4: 实现更新功能**

```typescript
async function updatePlace(db, id, newRating) {
  const place = await db.places.get(id);
  await db.places.update(id, {
    rating: newRating,
    properties: {
      ...place.properties,
      lastVisit: new Date().toISOString()
    }
  });
  console.log(`已更新 ${place.name} 的评分为 ${newRating}`);
}
```

**步骤 5: 实现删除功能**

```typescript
async function deletePlace(db, id) {
  const place = await db.places.get(id);
  await db.places.delete(id);
  console.log(`已删除地点: ${place.name}`);
}
```

**完整运行示例**

```typescript
async function main() {
  // 1. 初始化数据库
  const db = await initDatabase();

  // 2. 添加示例数据
  await seedData(db);

  // 3. 执行查询
  await queryExamples(db);

  // 4. 更新评分
  await updatePlace(db, 'cafe-001', 4.7);

  // 5. 删除地点（模拟店铺关闭）
  await deletePlace(db, 'cafe-002');

  // 6. 关闭数据库
  await db.close();
}

main().catch(console.error);
```

</details>

#### 测试验证

创建一个 HTML 文件来测试你的代码：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>个人地点标记系统</title>
</head>
<body>
  <h1>个人地点标记系统</h1>
  <div id="output"></div>

  <script type="module">
    import { WebGeoDB } from '@webgeodb/core';

    // 将上面的代码放在这里
    async function main() {
      const output = document.getElementById('output');

      function log(message) {
        const p = document.createElement('p');
        p.textContent = message;
        output.appendChild(p);
      }

      // ... 复制上面的完整代码 ...
      // 将 console.log 替换为 log()
    }

    main().catch(console.error);
  </script>
</body>
</html>
```

#### 答案参考

<details>
<summary>查看完整答案</summary>

完整代码已在上面的实现步骤中提供。你可以直接复制使用，或者根据需要进行修改和扩展。

**扩展建议**

1. **添加距离计算**: 计算两个地点之间的距离
2. **添加地图展示**: 使用 Leaflet 或 Mapbox 可视化地点
3. **添加搜索功能**: 按名称或地址搜索地点
4. **添加分类筛选**: 按类型筛选地点
5. **添加导出功能**: 将数据导出为 GeoJSON 文件

</details>

---

## 常见问题

### Q: WebGeoDB 和传统的后端空间数据库（如 PostGIS）有什么区别？

**A:** 主要区别在于：

| 特性 | WebGeoDB | PostGIS |
|------|----------|---------|
| **运行环境** | 浏览器 | 服务器 |
| **数据规模** | 100MB-1GB | TB 级别 |
| **离线支持** | ✅ 完全离线 | ❌ 需要网络 |
| **架构复杂度** | 简单（纯前端） | 复杂（需要后端） |
| **适用场景** | 离线应用、个人项目 | 企业级应用、大数据 |

WebGeoDB 适合离线优先的应用、原型开发、个人项目等场景；PostGIS 适合需要处理大量数据、多用户协作的企业级应用。

### Q: 浏览器存储空间有限制吗？

**A:** 是的，不同浏览器的限制不同：

- **Chrome/Firefox**: 约 60% 的可用磁盘空间
- **Safari**: 约 1GB

一般来说，现代浏览器可以存储几百 MB 到几 GB 的数据。对于大多数前端应用，这个空间已经足够。

**检查可用空间**

```typescript
// 检查 IndexedDB 使用情况
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate();
  console.log(`已用空间: ${estimate.usage / 1024 / 1024} MB`);
  console.log(`可用空间: ${estimate.quota / 1024 / 1024} MB`);
}
```

### Q: 如何处理坐标转换？

**A:** 如果你的数据使用 GCJ02 或 BD09 坐标系，需要先转换为 WGS84：

```typescript
// 使用 coordtransform 库
import coordtransform from 'coordtransform';

// GCJ02 转 WGS84
const [lng, lat] = coordtransform.gcj02towgs84(116.4541, 39.9375);

const geometry = {
  type: 'Point',
  coordinates: [lng, lat]
};
```

### Q: 如何保证数据安全？

**A:** WebGeoDB 数据存储在浏览器的 IndexedDB 中，安全措施包括：

1. **同源策略**: 只有相同域名下的网页可以访问数据
2. **HTTPS**: 在生产环境始终使用 HTTPS
3. **定期备份**: 导出数据为 JSON 文件
4. **版本控制**: 使用数据库版本管理升级

```typescript
// 导出数据
const backup = await db.places.toArray();
const json = JSON.stringify(backup, null, 2);

// 下载为文件
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `backup-${Date.now()}.json`;
a.click();
```

---

## 小结

本章介绍了 WebGeoDB 的核心概念和基础操作，你学会了：

### 核心要点回顾

- ✅ **理解 WebGeoDB**: 浏览器空间数据库，适合离线应用和前端项目
- ✅ **环境准备**: 安装、配置、浏览器兼容性检查
- ✅ **创建数据库**: 使用 `WebGeoDB` 类定义表结构和索引
- ✅ **CRUD 操作**: 插入、查询、更新、删除数据
- ✅ **几何类型**: GeoJSON 格式（Point, LineString, Polygon）
- ✅ **坐标系统**: WGS84 坐标系，[经度, 纬度] 格式
- ✅ **实战练习**: 完成个人地点标记系统

### 下一步学习

恭喜你完成了第 1 章！你已经掌握了 WebGeoDB 的基础用法。

**推荐学习路径**:

- **[第2章: 空间查询详解](./chapter-02-spatial-queries.md)** - 深入学习距离查询、相交查询、空间关系判断
- **[第3章: 索引优化](./chapter-03-indexing-optimization.md)** - 学习如何选择和优化索引
- **[相关API](../../api/reference.md)** - 查看完整的 API 参考文档
- **[实战示例](../../examples/basic-crud)** - 查看更多示例代码

**练习建议**:

1. 尝试扩展个人地点标记系统，添加更多功能
2. 使用真实数据（如你所在城市的咖啡店数据）进行练习
3. 尝试将数据可视化（可以使用 Leaflet 或 Mapbox）

---

## 参考资源

### 官方文档

- **[API 参考](../../api/reference.md)** - 完整的 API 文档
- **[快速开始](../../getting-started.md)** - 快速上手指南
- **[迁移指南](../../guides/migration.md)** - 从其他数据库迁移

### 外部资源

- **[GeoJSON 规范](https://geojson.org/)** - GeoJSON 格式标准
- **[Turf.js 手册](https://turfjs.org/)** - 地理空间分析库
- **[Leaflet 教程](https://leafletjs.com/)** - 开源地图库

### 示例代码

- **[基础 CRUD 示例](../../examples/basic-crud)** - 完整的增删改查示例
- **[空间查询示例](../../examples/spatial-query)** - 空间查询示例
