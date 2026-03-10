# 物流配送优化系统

> **学习时间**: 120-150分钟 | **难度**: 高级 | **先决条件**: 第1-4章

## 项目概述

物流配送优化系统是一个基于WebGeoDB的智能物流管理应用,展示了如何利用地理空间数据解决实际的物流配送问题。该系统通过Voronoi图划分配送区域,使用路径优化算法规划最优配送路线,并提供实时位置追踪和动态订单分配功能。

### 核心功能

1. **Voronoi图生成**: 根据仓库/配送中心位置自动划分配送区域
2. **路径规划**: 为配送员规划最优配送路线(TSP问题求解)
3. **实时追踪**: 追踪配送员位置和配送状态
4. **订单分配**: 智能分配订单给最近的可用配送员
5. **效率分析**: 分析配送效率,优化配送策略

### 技术亮点

- **Voronoi图算法**: 实现基于点的区域划分
- **TSP求解器**: 旅行商问题求解,优化配送路线
- **实时位置追踪**: 结合Geolocation API实现配送员追踪
- **空间索引优化**: 利用WebGeoDB空间索引加速查询
- **可视化展示**: 地图展示配送区域、路线和实时位置

### 应用场景

- 外卖配送平台
- 快递物流公司
- 本地生活服务
- 供应链管理

---

## 系统架构

```
┌─────────────────────────────────────────────────┐
│                用户界面层                        │
│  (地图可视化、订单管理、实时监控仪表板)         │
├─────────────────────────────────────────────────┤
│                业务逻辑层                        │
│  (路径规划、订单分配、配送管理)                 │
├─────────────────────────────────────────────────┤
│                数据访问层                        │
│  (仓库管理、订单管理、配送员管理)               │
├─────────────────────────────────────────────────┤
│                WebGeoDB                         │
│  (空间数据存储、空间查询、空间索引)             │
└─────────────────────────────────────────────────┘
```

---

## 数据模型设计

### 1. 仓库(Warehouses)

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

### 2. 配送区域(DeliveryZones)

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

### 3. 订单(Orders)

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

### 4. 配送员(DeliveryDrivers)

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

### 5. 配送路线(DeliveryRoutes)

```typescript
interface DeliveryRoute {
  id: string;
  driverId: string;
  orderId: string[];
  geometry: LineString;
  totalDistance: number;
  estimatedTime: number;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: number;
}
```

---

## 核心算法实现

### 1. Voronoi图生成

Voronoi图将平面划分为多个区域,每个区域包含所有距离该区域种子点最近的点。

**算法实现:**

```typescript
class VoronoiDiagramGenerator {
  /**
   * 生成Voronoi图
   * @param seeds 种子点(仓库位置)
   * @param bounds 边界范围
   * @returns Voronoi多边形数组
   */
  generate(
    seeds: Point[],
    bounds: [number, number, number, number]
  ): Array<{ seed: Point; polygon: Polygon }> {
    const [minX, minY, maxX, maxY] = bounds;
    const cells: Array<{ seed: Point; polygon: Polygon }> = [];

    // 生成网格
    const cellSize = 0.001; // 约100米
    const grid = this.createGrid(bounds, cellSize);

    // 为每个网格点分配最近的种子点
    const seedCells = new Map<number, Array<[number, number]>>();

    for (const point of grid) {
      const nearestSeed = this.findNearestSeed(point, seeds);
      const seedIndex = seeds.indexOf(nearestSeed);

      if (!seedCells.has(seedIndex)) {
        seedCells.set(seedIndex, []);
      }
      seedCells.get(seedIndex)!.push(point);
    }

    // 为每个种子点生成凸包
    for (const [seedIndex, points] of seedCells) {
      const seed = seeds[seedIndex];
      const polygon = this.concaveHull(points, cellSize * 2);

      cells.push({
        seed,
        polygon: this.clipToBounds(polygon, bounds)
      });
    }

    return cells;
  }

  /**
   * 创建网格点
   */
  private createGrid(
    bounds: [number, number, number, number],
    cellSize: number
  ): Array<[number, number]> {
    const [minX, minY, maxX, maxY] = bounds;
    const points: Array<[number, number]> = [];

    for (let x = minX; x <= maxX; x += cellSize) {
      for (let y = minY; y <= maxY; y += cellSize) {
        points.push([x, y]);
      }
    }

    return points;
  }

  /**
   * 查找最近的种子点
   */
  private findNearestSeed(
    point: [number, number],
    seeds: Point[]
  ): Point {
    let minDistance = Infinity;
    let nearest = seeds[0];

    for (const seed of seeds) {
      const distance = this.calculateDistance(
        point,
        seed.coordinates
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = seed;
      }
    }

    return nearest;
  }

  /**
   * 计算两点间距离(米)
   */
  private calculateDistance(
    from: [number, number],
    to: [number, number]
  ): number {
    const R = 6371e3; // 地球半径
    const φ1 = (from[1] * Math.PI) / 180;
    const φ2 = (to[1] * Math.PI) / 180;
    const Δφ = ((to[1] - from[1]) * Math.PI) / 180;
    const Δλ = ((to[0] - from[0]) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * 生成凹包(alpha shape)
   */
  private concaveHull(
    points: Array<[number, number]>,
    alpha: number
  ): Polygon {
    // 简化实现: 使用凸包算法
    // 实际应用中可以使用更复杂的凹包算法
    return this.convexHull(points);
  }

  /**
   * 生成凸包(Graham扫描算法)
   */
  private convexHull(points: Array<[number, number]>): Polygon {
    if (points.length < 3) {
      return {
        type: 'Polygon',
        coordinates: [[...points, points[0]]]
      };
    }

    // 找到最下方的点
    let bottom = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i][1] < points[bottom][1] ||
        (points[i][1] === points[bottom][1] && points[i][0] < points[bottom][0])) {
        bottom = i;
      }
    }

    // 按极角排序
    const sorted = points.slice();
    const pivot = sorted[bottom];
    sorted.splice(bottom, 1);

    sorted.sort((a, b) => {
      const angleA = Math.atan2(a[1] - pivot[1], a[0] - pivot[0]);
      const angleB = Math.atan2(b[1] - pivot[1], b[0] - pivot[0]);
      return angleA - angleB;
    });

    // Graham扫描
    const hull: Array<[number, number]> = [pivot];
    for (const point of sorted) {
      while (hull.length > 1) {
        const top = hull[hull.length - 1];
        const second = hull[hull.length - 2];

        const cross = (top[0] - second[0]) * (point[1] - second[1]) -
          (top[1] - second[1]) * (point[0] - second[0]);

        if (cross <= 0) {
          hull.pop();
        } else {
          break;
        }
      }
      hull.push(point);
    }

    return {
      type: 'Polygon',
      coordinates: [[...hull, hull[0]]]
    };
  }

  /**
   * 裁剪到边界
   */
  private clipToBounds(
    polygon: Polygon,
    bounds: [number, number, number, number]
  ): Polygon {
    // 使用Sutherland-Hodgman算法裁剪多边形
    const [minX, minY, maxX, maxY] = bounds;
    const result = polygon.coordinates[0];

    // 裁剪到边界(简化实现)
    // 实际应用中应实现完整的裁剪算法

    return {
      type: 'Polygon',
      coordinates: [result]
    };
  }
}
```

### 2. 路径规划(TSP求解)

使用最近邻算法和2-opt优化求解旅行商问题。

**算法实现:**

```typescript
class TSPSolver {
  /**
   * 求解TSP问题
   * @param points 需要访问的点
   * @param startPoint 起点
   * @returns 最优路径
   */
  solve(
    points: Point[],
    startPoint?: Point
  ): {
    route: Point[];
    totalDistance: number;
  } {
    if (points.length === 0) {
      return { route: [], totalDistance: 0 };
    }

    // 使用最近邻算法生成初始解
    let route = this.nearestNeighbor(points, startPoint);
    let totalDistance = this.calculateRouteDistance(route);

    // 使用2-opt优化
    let improved = true;
    let iterations = 0;
    const maxIterations = 100;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      for (let i = 1; i < route.length - 2; i++) {
        for (let j = i + 1; j < route.length - 1; j++) {
          const newRoute = this.twoOptSwap(route, i, j);
          const newDistance = this.calculateRouteDistance(newRoute);

          if (newDistance < totalDistance) {
            route = newRoute;
            totalDistance = newDistance;
            improved = true;
          }
        }
      }
    }

    return { route, totalDistance };
  }

  /**
   * 最近邻算法
   */
  private nearestNeighbor(
    points: Point[],
    startPoint?: Point
  ): Point[] {
    const unvisited = [...points];
    const route: Point[] = [];

    let current = startPoint || unvisited.shift()!;

    if (startPoint) {
      route.push(current);
    } else {
      current = unvisited.shift()!;
      route.push(current);
    }

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const distance = this.calculateDistance(
          current.coordinates,
          unvisited[i].coordinates
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      current = unvisited[nearestIndex];
      route.push(current);
      unvisited.splice(nearestIndex, 1);
    }

    return route;
  }

  /**
   * 2-opt交换
   */
  private twoOptSwap(
    route: Point[],
    i: number,
    j: number
  ): Point[] {
    const newRoute = route.slice(0, i);
    const reversed = route.slice(i, j + 1).reverse();
    const remaining = route.slice(j + 1);

    return [...newRoute, ...reversed, ...remaining];
  }

  /**
   * 计算路径总距离
   */
  private calculateRouteDistance(route: Point[]): number {
    if (route.length < 2) return 0;

    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      total += this.calculateDistance(
        route[i].coordinates,
        route[i + 1].coordinates
      );
    }

    return total;
  }

  /**
   * 计算两点间距离
   */
  private calculateDistance(
    from: [number, number],
    to: [number, number]
  ): number {
    const R = 6371e3;
    const φ1 = (from[1] * Math.PI) / 180;
    const φ2 = (to[1] * Math.PI) / 180;
    const Δφ = ((to[1] - from[1]) * Math.PI) / 180;
    const Δλ = ((to[0] - from[0]) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * 计算预估时间(考虑平均速度30km/h)
   */
  estimateTime(distance: number): number {
    const averageSpeed = 30 * 1000 / 3600; // 30km/h 转 m/s
    return distance / averageSpeed; // 秒
  }
}
```

### 3. 订单分配算法

基于距离和配送员负载的智能订单分配。

**算法实现:**

```typescript
class OrderAllocator {
  private db: WebGeoDB;

  constructor(db: WebGeoDB) {
    this.db = db;
  }

  /**
   * 分配订单给最优配送员
   */
  async allocateOrder(orderId: string): Promise<{
    driverId: string;
    estimatedTime: number;
  } | null> {
    // 获取订单信息
    const order = await this.db.orders.get(orderId);
    if (!order || order.status !== 'pending') {
      return null;
    }

    // 查找可用配送员
    const availableDrivers = await this.db.drivers
      .where('status', '=', 'available')
      .where('currentLoad', '<=', this.db.drivers.getField('maxCapacity'))
      .toArray();

    if (availableDrivers.length === 0) {
      return null;
    }

    // 计算每个配送员的得分
    const scores = await Promise.all(
      availableDrivers.map(async (driver) => {
        const distance = this.calculateDistance(
          driver.currentLocation.coordinates,
          order.pickupLocation.coordinates
        );

        const loadScore = 1 - (driver.currentLoad / driver.maxCapacity);
        const distanceScore = 1 / (1 + distance / 1000); // 归一化

        return {
          driver,
          score: loadScore * 0.3 + distanceScore * 0.7,
          distance
        };
      })
    );

    // 选择得分最高的配送员
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    // 更新订单状态
    await this.db.orders.update(orderId, {
      status: 'assigned',
      assignedAt: Date.now()
    });

    // 更新配送员状态
    await this.db.drivers.update(best.driver.id, {
      status: 'busy',
      currentLoad: best.driver.currentLoad + 1
    });

    // 估算配送时间
    const estimatedTime = Math.ceil(best.distance / 500 * 60); // 假设500m/min

    return {
      driverId: best.driver.id,
      estimatedTime
    };
  }

  /**
   * 批量分配订单
   */
  async allocateBatchOrders(orderIds: string[]): Promise<Map<string, string>> {
    const allocations = new Map<string, string>();

    for (const orderId of orderIds) {
      const result = await this.allocateOrder(orderId);
      if (result) {
        allocations.set(orderId, result.driverId);
      }
    }

    return allocations;
  }

  /**
   * 查找最近的配送员
   */
  async findNearestDriver(
    location: Point,
    maxDistance: number = 5000
  ): Promise<DeliveryDriver | null> {
    const nearby = await this.db.drivers
      .distance('currentLocation', location.coordinates, '<', maxDistance)
      .where('status', '=', 'available')
      .toArray();

    if (nearby.length === 0) return null;

    // 按距离排序
    nearby.sort((a, b) => {
      const distA = this.calculateDistance(
        a.currentLocation.coordinates,
        location.coordinates
      );
      const distB = this.calculateDistance(
        b.currentLocation.coordinates,
        location.coordinates
      );
      return distA - distB;
    });

    return nearby[0];
  }

  /**
   * 计算距离
   */
  private calculateDistance(
    from: [number, number],
    to: [number, number]
  ): number {
    const R = 6371e3;
    const φ1 = (from[1] * Math.PI) / 180;
    const φ2 = (to[1] * Math.PI) / 180;
    const Δφ = ((to[1] - from[1]) * Math.PI) / 180;
    const Δλ = ((to[0] - from[0]) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
```

---

## 完整实现

### 数据库初始化

```typescript
import { WebGeoDB } from '@webgeodb/core';

class LogisticsDatabase {
  private db: WebGeoDB;

  async init() {
    this.db = new WebGeoDB({
      name: 'logistics-system',
      version: 1
    });

    await this.db.open();

    // 定义表结构
    this.db.schema({
      warehouses: {
        id: 'string',
        name: 'string',
        address: 'string',
        geometry: 'geometry',
        capacity: 'number',
        operatingHours: 'json',
        status: 'string'
      },
      deliveryZones: {
        id: 'string',
        warehouseId: 'string',
        name: 'string',
        geometry: 'geometry',
        priority: 'number',
        averageDeliveryTime: 'number'
      },
      orders: {
        id: 'string',
        customerId: 'string',
        items: 'json',
        pickupLocation: 'geometry',
        deliveryLocation: 'geometry',
        status: 'string',
        priority: 'string',
        createdAt: 'number',
        assignedAt: 'number',
        deliveredAt: 'number',
        estimatedDeliveryTime: 'number'
      },
      drivers: {
        id: 'string',
        name: 'string',
        phone: 'string',
        currentLocation: 'geometry',
        status: 'string',
        currentLoad: 'number',
        maxCapacity: 'number',
        zoneId: 'string',
        lastUpdate: 'number'
      },
      routes: {
        id: 'string',
        driverId: 'string',
        orderIds: 'json',
        geometry: 'geometry',
        totalDistance: 'number',
        estimatedTime: 'number',
        status: 'string',
        createdAt: 'number'
      }
    });

    // 创建空间索引
    this.db.warehouses.createIndex('geometry');
    this.db.deliveryZones.createIndex('geometry');
    this.db.orders.createIndex('pickupLocation');
    this.db.orders.createIndex('deliveryLocation');
    this.db.drivers.createIndex('currentLocation');
    this.db.routes.createIndex('geometry');

    return this.db;
  }

  getDB() {
    return this.db;
  }
}
```

### 服务层实现

```typescript
class LogisticsService {
  private db: WebGeoDB;
  private voronoiGenerator: VoronoiDiagramGenerator;
  private tspSolver: TSPSolver;
  private orderAllocator: OrderAllocator;

  constructor(db: WebGeoDB) {
    this.db = db;
    this.voronoiGenerator = new VoronoiDiagramGenerator();
    this.tspSolver = new TSPSolver();
    this.orderAllocator = new OrderAllocator(db);
  }

  // === 仓库管理 ===

  async addWarehouse(warehouse: Warehouse): Promise<void> {
    await this.db.warehouses.insert(warehouse);

    // 重新生成配送区域
    await this.regenerateDeliveryZones();
  }

  async getNearbyWarehouses(
    location: Point,
    radius: number = 10000
  ): Promise<Warehouse[]> {
    return await this.db.warehouses
      .distance('geometry', location.coordinates, '<', radius)
      .where('status', '=', 'active')
      .toArray();
  }

  // === 配送区域管理 ===

  async regenerateDeliveryZones(): Promise<void> {
    // 获取所有活跃仓库
    const warehouses = await this.db.warehouses
      .where('status', '=', 'active')
      .toArray();

    if (warehouses.length === 0) return;

    // 计算边界
    const bounds = this.calculateBounds(warehouses.map(w => w.geometry));

    // 生成Voronoi图
    const cells = this.voronoiGenerator.generate(
      warehouses.map(w => w.geometry),
      bounds
    );

    // 清除旧区域
    await this.db.deliveryZones.clear();

    // 创建新区域
    for (const cell of cells) {
      const warehouse = warehouses.find(w =>
        w.geometry.coordinates[0] === cell.seed.coordinates[0] &&
        w.geometry.coordinates[1] === cell.seed.coordinates[1]
      );

      if (warehouse) {
        await this.db.deliveryZones.insert({
          id: crypto.randomUUID(),
          warehouseId: warehouse.id,
          name: `${warehouse.name}配送区域`,
          geometry: cell.polygon,
          priority: 1,
          averageDeliveryTime: 0
        });
      }
    }
  }

  private calculateBounds(points: Point[]): [number, number, number, number] {
    const lngs = points.map(p => p.coordinates[0]);
    const lats = points.map(p => p.coordinates[1]);

    return [
      Math.min(...lngs),
      Math.min(...lats),
      Math.max(...lngs),
      Math.max(...lats)
    ];
  }

  // === 订单管理 ===

  async createOrder(order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const newOrder: Order = {
      ...order,
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: Date.now()
    };

    await this.db.orders.insert(newOrder);

    // 自动分配订单
    const allocation = await this.orderAllocator.allocateOrder(newOrder.id);
    if (allocation) {
      await this.db.orders.update(newOrder.id, {
        estimatedDeliveryTime: allocation.estimatedTime
      });
    }

    return newOrder.id;
  }

  async getOrdersInZone(zoneId: string): Promise<Order[]> {
    const zone = await this.db.deliveryZones.get(zoneId);
    if (!zone) return [];

    return await this.db.orders
      .intersects('deliveryLocation', zone.geometry)
      .where('status', 'in', ['pending', 'assigned', 'picked_up', 'in_transit'])
      .toArray();
  }

  // === 配送员管理 ===

  async updateDriverLocation(
    driverId: string,
    location: Point
  ): Promise<void> {
    await this.db.drivers.update(driverId, {
      currentLocation: location,
      lastUpdate: Date.now()
    });
  }

  async getDriverRoute(driverId: string): Promise<DeliveryRoute | null> {
    return await this.db.routes
      .where('driverId', '=', driverId)
      .where('status', '=', 'in_progress')
      .first();
  }

  // === 路径规划 ===

  async planDeliveryRoute(
    driverId: string,
    orderIds: string[]
  ): Promise<DeliveryRoute> {
    // 获取订单配送位置
    const orders = await this.db.orders
      .where('id', 'in', orderIds)
      .toArray();

    const locations = orders.map(o => o.deliveryLocation);

    // 获取配送员当前位置
    const driver = await this.db.drivers.get(driverId);
    if (!driver) throw new Error('Driver not found');

    // 求解TSP
    const { route, totalDistance } = this.tspSolver.solve(
      locations,
      driver.currentLocation
    );

    // 估算时间
    const estimatedTime = this.tspSolver.estimateTime(totalDistance);

    // 创建路线几何
    const geometry: LineString = {
      type: 'LineString',
      coordinates: [
        driver.currentLocation.coordinates,
        ...route.map(p => p.coordinates)
      ]
    };

    // 保存路线
    const routeRecord: DeliveryRoute = {
      id: crypto.randomUUID(),
      driverId,
      orderIds,
      geometry,
      totalDistance,
      estimatedTime,
      status: 'planned',
      createdAt: Date.now()
    };

    await this.db.routes.insert(routeRecord);

    return routeRecord;
  }

  // === 实时追踪 ===

  async getDriverTrackingInfo(driverId: string): Promise<{
    driver: DeliveryDriver;
    currentRoute?: DeliveryRoute;
    nearbyOrders?: Order[];
  } | null> {
    const driver = await this.db.drivers.get(driverId);
    if (!driver) return null;

    const currentRoute = await this.getDriverRoute(driverId);

    let nearbyOrders: Order[] | undefined;
    if (driver.status === 'available') {
      nearbyOrders = await this.db.orders
        .distance('pickupLocation', driver.currentLocation.coordinates, '<', 2000)
        .where('status', '=', 'pending')
        .limit(10)
        .toArray();
    }

    return {
      driver,
      currentRoute,
      nearbyOrders
    };
  }

  // === 效率分析 ===

  async getDeliveryEfficiencyReport(
    startTime: number,
    endTime: number
  ): Promise<{
    totalOrders: number;
    deliveredOrders: number;
    averageDeliveryTime: number;
    totalDistance: number;
    driverEfficiency: Array<{
      driverId: string;
      deliveries: number;
      averageTime: number;
    }>;
  }> {
    const orders = await this.db.orders
      .where('createdAt', '>=', startTime)
      .where('createdAt', '<=', endTime)
      .toArray();

    const deliveredOrders = orders.filter(o => o.status === 'delivered');

    const averageDeliveryTime = deliveredOrders.length > 0
      ? deliveredOrders.reduce((sum, o) =>
        sum + (o.deliveredAt! - o.createdAt), 0) / deliveredOrders.length
      : 0;

    const routes = await this.db.routes
      .where('createdAt', '>=', startTime)
      .where('createdAt', '<=', endTime)
      .where('status', '=', 'completed')
      .toArray();

    const totalDistance = routes.reduce((sum, r) => sum + r.totalDistance, 0);

    // 计算每个配送员的效率
    const driverStats = new Map<string, { count: number; totalTime: number }>();

    for (const order of deliveredOrders) {
      // 这里需要通过路线关联配送员
      // 简化实现,实际应该通过route表关联
    }

    return {
      totalOrders: orders.length,
      deliveredOrders: deliveredOrders.length,
      averageDeliveryTime,
      totalDistance,
      driverEfficiency: []
    };
  }
}
```

---

## 使用示例

### 初始化系统

```typescript
async function initializeLogisticsSystem() {
  // 初始化数据库
  const logisticsDB = new LogisticsDatabase();
  const db = await logisticsDB.init();

  // 初始化服务
  const logisticsService = new LogisticsService(db);

  // 添加仓库
  await logisticsService.addWarehouse({
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

  await logisticsService.addWarehouse({
    id: 'warehouse-2',
    name: '上海中心仓',
    address: '上海市黄浦区',
    geometry: {
      type: 'Point',
      coordinates: [121.4737, 31.2304]
    },
    capacity: 1200,
    operatingHours: { open: '08:00', close: '22:00' },
    status: 'active'
  });

  console.log('✅ 物流系统初始化完成');

  return logisticsService;
}
```

### 创建订单并自动分配

```typescript
async function createAndAllocateOrder(service: LogisticsService) {
  // 创建订单
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

  console.log(`✅ 订单创建成功: ${orderId}`);

  // 获取订单详情
  const order = await service.db.orders.get(orderId);
  console.log('订单状态:', order?.status);
  console.log('预计送达时间:', order?.estimatedDeliveryTime, '分钟');

  return orderId;
}
```

### 规划配送路线

```typescript
async function planDeliveryRoute(service: LogisticsService) {
  // 获取待配送订单
  const pendingOrders = await service.db.orders
    .where('status', '=', 'assigned')
    .limit(10)
    .toArray();

  if (pendingOrders.length === 0) {
    console.log('没有待配送订单');
    return;
  }

  // 选择一个配送员
  const driver = await service.db.drivers
    .where('status', '=', 'available')
    .first();

  if (!driver) {
    console.log('没有可用配送员');
    return;
  }

  // 规划路线
  const route = await service.planDeliveryRoute(
    driver.id,
    pendingOrders.map(o => o.id)
  );

  console.log(`✅ 路线规划完成`);
  console.log(`总距离: ${(route.totalDistance / 1000).toFixed(2)} km`);
  console.log(`预计时间: ${(route.estimatedTime / 60).toFixed(0)} 分钟`);
}
```

### 实时追踪

```typescript
async function trackDriver(service: LogisticsService, driverId: string) {
  // 更新配送员位置
  await service.updateDriverLocation(driverId, {
    type: 'Point',
    coordinates: [116.4100, 39.9100]
  });

  // 获取追踪信息
  const trackingInfo = await service.getDriverTrackingInfo(driverId);

  if (trackingInfo) {
    console.log('配送员:', trackingInfo.driver.name);
    console.log('状态:', trackingInfo.driver.status);
    console.log('当前位置:', trackingInfo.driver.currentLocation.coordinates);

    if (trackingInfo.currentRoute) {
      console.log('当前路线:', trackingInfo.currentRoute.orderIds);
    }

    if (trackingInfo.nearbyOrders) {
      console.log('附近订单:', trackingInfo.nearbyOrders.length);
    }
  }
}
```

---

## 地图可视化

### 使用Leaflet展示

```typescript
import L from 'leaflet';

class LogisticsMapVisualizer {
  private map: L.Map;
  private service: LogisticsService;

  constructor(mapId: string, service: LogisticsService) {
    this.service = service;

    // 初始化地图
    this.map = L.map(mapId).setView([39.9042, 116.4074], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  /**
   * 显示仓库和配送区域
   */
  async displayWarehousesAndZones() {
    const warehouses = await this.service.db.warehouses.toArray();
    const zones = await this.service.db.deliveryZones.toArray();

    // 显示配送区域
    zones.forEach(zone => {
      const coords = zone.geometry.coordinates[0].map(c => [c[1], c[0]] as [number, number]);

      L.polygon(coords, {
        color: '#3388ff',
        weight: 2,
        fillOpacity: 0.1
      })
        .bindPopup(`<b>${zone.name}</b>`)
        .addTo(this.map);
    });

    // 显示仓库
    warehouses.forEach(warehouse => {
      const [lng, lat] = warehouse.geometry.coordinates;

      L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'warehouse-icon',
          html: '🏭',
          iconSize: [30, 30]
        })
      })
        .bindPopup(`
          <b>${warehouse.name}</b><br>
          ${warehouse.address}<br>
          容量: ${warehouse.capacity}
        `)
        .addTo(this.map);
    });
  }

  /**
   * 显示配送员位置
   */
  async displayDrivers() {
    const drivers = await this.service.db.drivers.toArray();

    drivers.forEach(driver => {
      const [lng, lat] = driver.currentLocation.coordinates;

      const color = driver.status === 'available' ? 'green' :
        driver.status === 'busy' ? 'red' : 'gray';

      L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      })
        .bindPopup(`
          <b>${driver.name}</b><br>
          状态: ${driver.status}<br>
          当前负载: ${driver.currentLoad}/${driver.maxCapacity}
        `)
        .addTo(this.map);
    });
  }

  /**
   * 显示配送路线
   */
  async displayRoute(routeId: string) {
    const route = await this.service.db.routes.get(routeId);
    if (!route) return;

    const coords = route.geometry.coordinates.map(c =>
      [c[1], c[0]] as [number, number]
    );

    L.polyline(coords, {
      color: '#ff5722',
      weight: 4,
      opacity: 0.7
    })
      .bindPopup(`
        <b>配送路线</b><br>
        距离: ${(route.totalDistance / 1000).toFixed(2)} km<br>
        预计时间: ${(route.estimatedTime / 60).toFixed(0)} 分钟<br>
        订单数: ${route.orderIds.length}
      `)
      .addTo(this.map);

    // 显示订单点
    for (const orderId of route.orderIds) {
      const order = await this.service.db.orders.get(orderId);
      if (order) {
        const [lng, lat] = order.deliveryLocation.coordinates;

        L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'order-icon',
            html: '📦',
            iconSize: [20, 20]
          })
        })
          .bindPopup(`<b>订单 ${orderId.slice(0, 8)}</b>`)
          .addTo(this.map);
      }
    }
  }

  /**
   * 显示订单
   */
  async displayOrders() {
    const orders = await this.service.db.orders
      .where('status', 'in', ['pending', 'assigned', 'in_transit'])
      .toArray();

    orders.forEach(order => {
      const [lng, lat] = order.deliveryLocation.coordinates;

      const color = order.priority === 'urgent' ? 'red' :
        order.priority === 'high' ? 'orange' : 'blue';

      L.circleMarker([lat, lng], {
        radius: 6,
        fillColor: color,
        color: '#fff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7
      })
        .bindPopup(`
          <b>订单 ${order.id.slice(0, 8)}</b><br>
          状态: ${order.status}<br>
          优先级: ${order.priority}
        `)
        .addTo(this.map);
    });
  }
}

// 使用
async function visualizeLogistics() {
  const service = await initializeLogisticsSystem();
  const visualizer = new LogisticsMapVisualizer('map', service);

  // 显示所有数据
  await visualizer.displayWarehousesAndZones();
  await visualizer.displayDrivers();
  await visualizer.displayOrders();
}
```

---

## 测试示例

### 单元测试

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('LogisticsSystem', () => {
  let service: LogisticsService;
  let db: WebGeoDB;

  beforeEach(async () => {
    const logisticsDB = new LogisticsDatabase();
    db = await logisticsDB.init();
    service = new LogisticsService(db);
  });

  describe('Voronoi Diagram', () => {
    it('should generate delivery zones from warehouses', async () => {
      // 添加仓库
      await service.addWarehouse({
        id: 'wh1',
        name: 'Warehouse 1',
        address: 'Address 1',
        geometry: { type: 'Point', coordinates: [116.4074, 39.9042] },
        capacity: 1000,
        operatingHours: { open: '08:00', close: '22:00' },
        status: 'active'
      });

      await service.addWarehouse({
        id: 'wh2',
        name: 'Warehouse 2',
        address: 'Address 2',
        geometry: { type: 'Point', coordinates: [116.4174, 39.9142] },
        capacity: 1000,
        operatingHours: { open: '08:00', close: '22:00' },
        status: 'active'
      });

      // 检查区域生成
      const zones = await db.deliveryZones.toArray();
      expect(zones.length).toBe(2);

      // 验证区域几何
      expect(zones[0].geometry.type).toBe('Polygon');
      expect(zones[0].geometry.coordinates.length).toBeGreaterThan(0);
    });
  });

  describe('Order Allocation', () => {
    it('should allocate order to nearest driver', async () => {
      // 添加配送员
      await db.drivers.insert({
        id: 'driver1',
        name: 'Driver 1',
        phone: '123456',
        currentLocation: { type: 'Point', coordinates: [116.4074, 39.9042] },
        status: 'available',
        currentLoad: 0,
        maxCapacity: 10,
        lastUpdate: Date.now()
      });

      // 创建订单
      const orderId = await service.createOrder({
        customerId: 'customer1',
        items: [{ productId: 'p1', quantity: 1 }],
        pickupLocation: { type: 'Point', coordinates: [116.4074, 39.9042] },
        deliveryLocation: { type: 'Point', coordinates: [116.4100, 39.9070] },
        priority: 'normal'
      });

      // 检查订单状态
      const order = await db.orders.get(orderId);
      expect(order?.status).toBe('assigned');
      expect(order?.assignedAt).toBeDefined();
    });
  });

  describe('Route Planning', () => {
    it('should plan optimal route for multiple orders', async () => {
      // 创建多个订单
      const orderIds = [];
      for (let i = 0; i < 5; i++) {
        const orderId = await service.createOrder({
          customerId: `customer${i}`,
          items: [{ productId: 'p1', quantity: 1 }],
          pickupLocation: { type: 'Point', coordinates: [116.4074, 39.9042] },
          deliveryLocation: {
            type: 'Point',
            coordinates: [116.4074 + i * 0.001, 39.9042 + i * 0.001]
          },
          priority: 'normal'
        });
        orderIds.push(orderId);
      }

      // 添加配送员
      await db.drivers.insert({
        id: 'driver1',
        name: 'Driver 1',
        phone: '123456',
        currentLocation: { type: 'Point', coordinates: [116.4074, 39.9042] },
        status: 'available',
        currentLoad: 0,
        maxCapacity: 10,
        lastUpdate: Date.now()
      });

      // 规划路线
      const route = await service.planDeliveryRoute('driver1', orderIds);

      // 验证路线
      expect(route.orderIds.length).toBe(5);
      expect(route.totalDistance).toBeGreaterThan(0);
      expect(route.estimatedTime).toBeGreaterThan(0);
      expect(route.geometry.type).toBe('LineString');
    });
  });
});
```

---

## 性能优化建议

### 1. 空间索引优化

```typescript
// 为常用查询创建复合索引
db.orders.createIndex(['status', 'createdAt']);
db.drivers.createIndex(['status', 'currentLoad']);
```

### 2. 批量操作

```typescript
// 批量插入订单
async function bulkCreateOrders(orders: Omit<Order, 'id' | 'createdAt'>[]) {
  const ordersWithIds = orders.map(order => ({
    ...order,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    status: 'pending' as const
  }));

  await db.orders.bulkPut(ordersWithIds);

  // 批量分配
  const allocator = new OrderAllocator(db);
  await allocator.allocateBatchOrders(ordersWithIds.map(o => o.id));
}
```

### 3. 查询优化

```typescript
// 使用limit限制结果数量
const recentOrders = await db.orders
  .orderBy('createdAt', 'desc')
  .limit(100)
  .toArray();

// 使用分页
async function getPaginatedOrders(page: number, pageSize: number) {
  return await db.orders
    .orderBy('createdAt', 'desc')
    .offset(page * pageSize)
    .limit(pageSize)
    .toArray();
}
```

---

## 扩展功能

### 1. 配送时间预测

```typescript
class DeliveryTimePredictor {
  private db: WebGeoDB;

  constructor(db: WebGeoDB) {
    this.db = db;
  }

  async predictDeliveryTime(
    pickupLocation: Point,
    deliveryLocation: Point,
    timeOfDay: number
  ): Promise<number> {
    // 获取历史数据
    const historicalDeliveries = await this.db.routes
      .where('createdAt', '>', Date.now() - 30 * 24 * 3600 * 1000) // 最近30天
      .toArray();

    // 计算相似路线的平均时间
    // 这里简化实现,实际应该使用更复杂的预测模型

    const distance = this.calculateDistance(
      pickupLocation.coordinates,
      deliveryLocation.coordinates
    );

    const baseTime = distance / 500 * 60; // 假设500m/min

    // 考虑时间段因素
    const hour = new Date(timeOfDay).getHours();
    const rushHourMultiplier = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
      ? 1.5
      : 1.0;

    return baseTime * rushHourMultiplier;
  }

  private calculateDistance(
    from: [number, number],
    to: [number, number]
  ): number {
    const R = 6371e3;
    const φ1 = (from[1] * Math.PI) / 180;
    const φ2 = (to[1] * Math.PI) / 180;
    const Δφ = ((to[1] - from[1]) * Math.PI) / 180;
    const Δλ = ((to[0] - from[0]) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
```

### 2. 动态区域调整

```typescript
async function adjustZonesBasedOnDemand(service: LogisticsService) {
  // 分析订单密度
  const orders = await service.db.orders
    .where('createdAt', '>', Date.now() - 7 * 24 * 3600 * 1000) // 最近7天
    .toArray();

  // 计算每个区域的订单密度
  const zones = await service.db.deliveryZones.toArray();

  for (const zone of zones) {
    const ordersInZone = orders.filter(order =>
      service.db.orders.intersects('deliveryLocation', zone.geometry)
    );

    // 如果订单过多,考虑缩小区域或增加仓库
    if (ordersInZone.length > 1000) {
      console.log(`区域 ${zone.name} 订单密度过高,建议调整`);
    }
  }
}
```

---

## 总结

本教程展示了如何使用WebGeoDB构建一个完整的物流配送优化系统,涵盖了:

### 核心技术点

- ✅ **Voronoi图算法**: 自动划分配送区域
- ✅ **TSP求解**: 优化配送路线
- ✅ **智能分配**: 基于距离和负载的订单分配
- ✅ **实时追踪**: 配送员位置和状态追踪
- ✅ **空间索引**: 加速地理查询
- ✅ **地图可视化**: 直观展示配送数据

### 应用价值

- 提高配送效率
- 降低运营成本
- 提升客户满意度
- 优化资源配置

### 下一步

- 集成真实的地图API(高德、百度)
- 添加实时路况数据
- 实现机器学习预测模型
- 开发移动端应用

---

## 参考资源

- **[Voronoi图算法](https://en.wikipedia.org/wiki/Voronoi_diagram)** - Voronoi图原理
- **[TSP问题](https://en.wikipedia.org/wiki/Travelling_salesman_problem)** - 旅行商问题
- **[2-opt算法](https://en.wikipedia.org/wiki/2-opt)** - 路径优化算法
- **[WebGeoDB API](../../api/reference.md)** - WebGeoDB完整API文档
- **[示例代码](https://github.com/zhyt1985/webgeodb/tree/main/examples/projects/logistics)** - 完整示例代码
