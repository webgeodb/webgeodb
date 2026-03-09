# WebGeoDB 示例代码

这个目录包含了 WebGeoDB 的实际使用示例。

## 📁 示例列表

### 1. 基础 CRUD 操作
演示了基本的增删改查操作。

**运行方式**：
```bash
cd examples/basic-crud
pnpm install
pnpm start
```

**功能**：
- 创建数据库
- 插入单条和批量数据
- 查询数据
- 更新和删除数据

### 2. 空间查询
演示了各种空间查询功能。

**运行方式**：
```bash
cd examples/spatial-query
pnpm install
pnpm start
```

**功能**：
- 距离查询
- 相交查询
- 包含查询
- 在内查询

### 3. 性能优化
演示了性能优化技巧。

**运行方式**：
```bash
cd examples/performance
pnpm install
pnpm start
```

**功能**：
- 批量操作
- 索引使用
- 查询优化

### 4. 实时位置追踪
演示了实时位置追踪功能。

**运行方式**：
```bash
cd examples/realtime-tracking
pnpm install
pnpm start
```

**功能**：
- 实时位置更新
- 轨迹记录
- 附近搜索

## 🚀 快速开始

1. **克隆仓库**：
```bash
git clone https://github.com/zhyt1985/webgeodb.git
cd webgeodb
```

2. **安装依赖**：
```bash
pnpm install
```

3. **构建项目**：
```bash
pnpm build
```

4. **运行示例**：
```bash
cd examples/basic-crud
pnpm start
```

## 📝 更多示例

### 创建简单的地理标记应用

```typescript
import { WebGeoDB } from '@webgeodb/core';

// 1. 创建数据库
const db = new WebGeoDB({ name: 'markers-db' });
db.schema({
  markers: {
    id: 'string',
    title: 'string',
    description: 'string',
    latitude: 'number',
    longitude: 'number',
    category: 'string',
    createdAt: 'number'
  }
});

await db.open();

// 2. 创建空间索引
db.markers.createIndex('location', { auto: true });

// 3. 添加标记
await db.markers.insert({
  id: '1',
  title: '埃菲尔铁塔',
  description: '巴黎的著名地标',
  latitude: 48.8584,
  longitude: 2.2945,
  category: 'landmark',
  createdAt: Date.now()
});

// 4. 查找附近的标记
const nearby = await db.markers
  .distance('location', [48.8584, 2.2945], '<', 1000)
  .toArray();

console.log(`找到 ${nearby.length} 个附近的标记`);
```

### 构建地理围栏应用

```typescript
// 定义地理围栏
const geofence = {
  type: 'Polygon',
  coordinates: [[
    [48.85, 2.25],
    [48.85, 2.35],
    [48.87, 2.35],
    [48.87, 2.25],
    [48.85, 2.25]
  ]]
};

// 检查用户是否在围栏内
async function checkUserInGeofence(userId: string) {
  const user = await db.users.get(userId);

  const inGeofence = await db.markers
    .within('location', geofence)
    .where('id', '=', userId)
    .toArray();

  return inGeofence.length > 0;
}
```

## 🔧 开发提示

### 性能优化建议

1. **使用批量操作**：
```typescript
// ❌ 慢
for (const item of items) {
  await db.markers.insert(item);
}

// ✅ 快
await db.markers.insertMany(items);
```

2. **创建适当的索引**：
```typescript
// 为经常查询的字段创建索引
db.markers.createIndex('category');
db.markers.createIndex('location', { type: 'flatbush' });
```

3. **使用事务**：
```typescript
await db.transaction('rw', [db.markers, db.logs], async () => {
  await db.markers.insert(marker);
  await db.logs.insert({ action: 'insert', markerId: marker.id });
});
```

### 错误处理

```typescript
try {
  await db.open();
} catch (error) {
  if (error.name === 'VersionError') {
    console.error('数据库版本冲突');
    // 处理版本冲突
  } else {
    console.error('数据库打开失败:', error);
  }
}
```

## 📚 相关文档

- [快速开始](../docs/getting-started.md)
- [API 参考](../docs/api/reference.md)
- [性能优化指南](../docs/guides/performance.md)
- [最佳实践](../docs/guides/best-practices.md)
