# 物流配送优化系统示例

## 示例信息

- **项目**: 专题应用 - 物流配送优化系统
- **难度**: 高级
- **预计时间**: 120-150分钟

## 学习目标

通过本示例，你将学习：

1. 如何使用Voronoi图算法划分配送区域
2. 如何实现TSP(旅行商问题)求解器优化配送路线
3. 如何实现基于距离和负载的智能订单分配
4. 如何使用WebGeoDB空间索引加速地理查询
5. 如何构建完整的物流管理系统

## 前置要求

- Node.js >= 16
- npm 或 pnpm
- 完成第1-4章的学习

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

示例将演示完整的物流配送流程，包括：
- 仓库管理和配送区域生成
- 订单创建和自动分配
- 配送路线规划
- 实时位置追踪
- 效率分析报告

## 代码结构

```
.
├── src/
│   ├── index.ts                  # 主程序入口
│   ├── database/                 # 数据库层
│   │   ├── LogisticsDatabase.ts  # 数据库初始化
│   │   └── schema.ts             # 数据模型定义
│   ├── algorithms/               # 核心算法
│   │   ├── VoronoiDiagram.ts     # Voronoi图生成
│   │   ├── TSPSolver.ts          # TSP求解器
│   │   └── OrderAllocator.ts     # 订单分配算法
│   ├── services/                 # 业务逻辑层
│   │   └── LogisticsService.ts   # 物流服务
│   ├── utils/                    # 工具函数
│   │   └── geometry.ts           # 几何计算工具
│   └── demo/                     # 演示脚本
│       ├── init-system.ts        # 系统初始化
│       ├── create-orders.ts      # 创建订单
│       ├── plan-routes.ts        # 规划路线
│       └── tracking.ts           # 实时追踪
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
└── README.md                     # 本文件
```

## 核心功能

### 1. Voronoi图生成

根据仓库位置自动划分配送区域：

```typescript
const generator = new VoronoiDiagramGenerator();
const cells = generator.generate(warehouseLocations, bounds);
```

**算法特点**：
- 基于网格的Voronoi图生成
- 自动计算每个仓库的配送区域
- 支持动态调整区域边界

### 2. 路径优化

使用TSP求解器优化配送路线：

```typescript
const solver = new TSPSolver();
const { route, totalDistance } = solver.solve(deliveryPoints);
```

**算法特点**：
- 最近邻算法生成初始解
- 2-opt算法优化路径
- 支持起点和终点约束

### 3. 智能订单分配

基于距离和负载自动分配订单：

```typescript
const allocator = new OrderAllocator(db);
const result = await allocator.allocateOrder(orderId);
```

**分配策略**：
- 优先分配给最近的配送员
- 考虑配送员当前负载
- 支持批量订单分配

### 4. 实时追踪

追踪配送员位置和配送状态：

```typescript
await service.updateDriverLocation(driverId, location);
const trackingInfo = await service.getDriverTrackingInfo(driverId);
```

**追踪功能**：
- 实时位置更新
- 配送状态监控
- 附近订单查询

## 数据模型

### 仓库 (Warehouses)

```typescript
interface Warehouse {
  id: string;
  name: string;
  address: string;
  geometry: Point;
  capacity: number;
  operatingHours: {
    open: string;
    close: string;
  };
  status: 'active' | 'inactive';
}
```

### 配送区域 (DeliveryZones)

```typescript
interface DeliveryZone {
  id: string;
  warehouseId: string;
  name: string;
  geometry: Polygon;
  priority: number;
  averageDeliveryTime: number;
}
```

### 订单 (Orders)

```typescript
interface Order {
  id: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  pickupLocation: Point;
  deliveryLocation: Point;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: number;
  assignedAt?: number;
  deliveredAt?: number;
  estimatedDeliveryTime?: number;
}
```

### 配送员 (Drivers)

```typescript
interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  currentLocation: Point;
  status: 'available' | 'busy' | 'offline';
  currentLoad: number;
  maxCapacity: number;
  zoneId?: string;
  lastUpdate: number;
}
```

### 配送路线 (Routes)

```typescript
interface DeliveryRoute {
  id: string;
  driverId: string;
  orderIds: string[];
  geometry: LineString;
  totalDistance: number;
  estimatedTime: number;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: number;
}
```

## 使用示例

### 初始化系统

```typescript
// 创建数据库
const logisticsDB = new LogisticsDatabase();
const db = await logisticsDB.init();

// 创建服务
const service = new LogisticsService(db);

// 添加仓库
await service.addWarehouse({
  id: 'warehouse-1',
  name: '北京中心仓',
  address: '北京市朝阳区',
  geometry: {
    type: 'Point',
    coordinates: [116.4074, 39.9042]
  },
  capacity: 1000,
  operatingHours: { open: '08:00', close: '22:00' },
  status: 'active'
});
```

### 创建订单

```typescript
const orderId = await service.createOrder({
  customerId: 'customer-1',
  items: [
    { productId: 'product-1', quantity: 2 }
  ],
  pickupLocation: {
    type: 'Point',
    coordinates: [116.4074, 39.9042]
  },
  deliveryLocation: {
    type: 'Point',
    coordinates: [116.4174, 39.9142]
  },
  priority: 'normal'
});

console.log(`订单创建成功: ${orderId}`);
```

### 规划配送路线

```typescript
// 获取待配送订单
const pendingOrders = await db.orders
  .where('status', '=', 'assigned')
  .limit(10)
  .toArray();

// 规划路线
const route = await service.planDeliveryRoute(
  driverId,
  pendingOrders.map(o => o.id)
);

console.log(`总距离: ${(route.totalDistance / 1000).toFixed(2)} km`);
console.log(`预计时间: ${(route.estimatedTime / 60).toFixed(0)} 分钟`);
```

### 实时追踪

```typescript
// 更新配送员位置
await service.updateDriverLocation(driverId, {
  type: 'Point',
  coordinates: [116.4100, 39.9100]
});

// 获取追踪信息
const trackingInfo = await service.getDriverTrackingInfo(driverId);
console.log('配送员:', trackingInfo.driver.name);
console.log('状态:', trackingInfo.driver.status);
```

## 性能优化

### 1. 空间索引

```typescript
// 为常用查询创建空间索引
db.orders.createIndex('pickupLocation');
db.orders.createIndex('deliveryLocation');
db.drivers.createIndex('currentLocation');
```

### 2. 批量操作

```typescript
// 批量插入订单
await db.orders.bulkPut(orders);

// 批量分配
await allocator.allocateBatchOrders(orderIds);
```

### 3. 查询优化

```typescript
// 使用limit限制结果
const recent = await db.orders
  .orderBy('createdAt', 'desc')
  .limit(100)
  .toArray();
```

## 扩展功能

### 1. 配送时间预测

```typescript
class DeliveryTimePredictor {
  async predictDeliveryTime(
    pickupLocation: Point,
    deliveryLocation: Point,
    timeOfDay: number
  ): Promise<number> {
    // 基于历史数据预测配送时间
    // 考虑时段、交通状况等因素
  }
}
```

### 2. 动态区域调整

```typescript
async function adjustZonesBasedOnDemand(service: LogisticsService) {
  // 分析订单密度
  // 动态调整配送区域
  // 优化仓库布局
}
```

### 3. 地图可视化

集成Leaflet或Mapbox展示：
- 仓库和配送区域
- 配送员实时位置
- 配送路线
- 订单分布

## 测试

运行测试验证功能：

```bash
npm test
```

测试覆盖：
- Voronoi图生成
- TSP路径优化
- 订单分配算法
- 空间查询性能

## 相关文档

- [中文教程](../../../docs/tutorials/zh/projects/logistics.md)
- [英文教程](../../../docs/tutorials/en/projects/logistics.md)
- [API参考](../../../docs/api/reference.md)

## 常见问题

### Q: Voronoi图生成性能如何优化？

**A:** 使用网格大小控制精度，较大的网格生成更快但精度较低。可以根据实际需求调整cellSize参数。

### Q: TSP问题如何处理大量订单？

**A:** 对于大量订单(>50个)，建议：
1. 先按区域聚类
2. 每个区域单独规划路线
3. 使用更高级的算法(如模拟退火)

### Q: 如何处理配送员实时位置更新？

**A:** 使用WebGeodb的批量更新功能，结合WebSocket实现实时推送。

## 许可证

MIT
