/**
 * 物流服务类
 *
 * 整合所有功能，提供统一的业务逻辑接口
 */

import type { WebGeoDB } from '@webgeodb/core';
import type {
  Warehouse,
  Order,
  DeliveryDriver,
  DeliveryRoute,
  EfficiencyReport,
  TrackingInfo,
  Point
} from '../database/schema.js';
import { VoronoiDiagramGenerator } from '../algorithms/VoronoiDiagram.js';
import { TSPSolver } from '../algorithms/TSPSolver.js';
import { OrderAllocator } from '../algorithms/OrderAllocator.js';
import { calculateBounds, formatDistance, formatTime } from '../utils/geometry.js';

export class LogisticsService {
  private voronoiGenerator: VoronoiDiagramGenerator;
  private tspSolver: TSPSolver;
  private orderAllocator: OrderAllocator;

  constructor(public db: WebGeoDB) {
    this.voronoiGenerator = new VoronoiDiagramGenerator();
    this.tspSolver = new TSPSolver();
    this.orderAllocator = new OrderAllocator(db);
  }

  // ==================== 仓库管理 ====================

  /**
   * 添加仓库
   */
  async addWarehouse(warehouse: Warehouse): Promise<void> {
    await this.db.warehouses.insert(warehouse);
    console.log(`✅ 仓库添加成功: ${warehouse.name}`);

    // 重新生成配送区域
    await this.regenerateDeliveryZones();
  }

  /**
   * 获取附近的仓库
   */
  async getNearbyWarehouses(
    location: Point,
    radius: number = 10000
  ): Promise<Warehouse[]> {
    return await this.db.warehouses
      .distance('geometry', location.coordinates, '<', radius)
      .where('status', '=', 'active')
      .toArray();
  }

  /**
   * 获取所有活跃仓库
   */
  async getActiveWarehouses(): Promise<Warehouse[]> {
    return await this.db.warehouses.where('status', '=', 'active').toArray();
  }

  // ==================== 配送区域管理 ====================

  /**
   * 重新生成配送区域
   */
  async regenerateDeliveryZones(): Promise<void> {
    console.log(`\n🔄 重新生成配送区域...`);

    // 获取所有活跃仓库
    const warehouses = await this.getActiveWarehouses();

    if (warehouses.length === 0) {
      console.warn(`⚠️ 没有活跃仓库`);
      return;
    }

    // 生成Voronoi图
    const cells = this.voronoiGenerator.generateFromPoints(
      warehouses.map(w => w.geometry)
    );

    // 清除旧区域
    await this.db.deliveryZones.clear();

    // 创建新区域
    for (const cell of cells) {
      const warehouse = warehouses.find(
        w =>
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

    console.log(`✅ 配送区域生成完成，数量: ${cells.length}`);
  }

  /**
   * 获取所有配送区域
   */
  async getDeliveryZones(): Promise<any[]> {
    return await this.db.deliveryZones.toArray();
  }

  // ==================== 订单管理 ====================

  /**
   * 创建订单
   */
  async createOrder(order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const newOrder: Order = {
      ...order,
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: Date.now()
    };

    await this.db.orders.insert(newOrder);
    console.log(`✅ 订单创建成功: ${newOrder.id.slice(0, 8)}`);

    // 自动分配订单
    const allocation = await this.orderAllocator.allocateOrder(newOrder.id);

    if (allocation) {
      await this.db.orders.update(newOrder.id, {
        estimatedDeliveryTime: allocation.estimatedTime
      });

      console.log(`✅ 订单已分配给配送员，预计时间: ${allocation.estimatedTime}分钟`);
    } else {
      console.log(`⚠️ 暂时无法分配订单`);
    }

    return newOrder.id;
  }

  /**
   * 获取区域内的订单
   */
  async getOrdersInZone(zoneId: string): Promise<Order[]> {
    const zone = await this.db.deliveryZones.get(zoneId);
    if (!zone) return [];

    return await this.db.orders
      .intersects('deliveryLocation', zone.geometry)
      .where('status', 'in', ['pending', 'assigned', 'picked_up', 'in_transit'])
      .toArray();
  }

  /**
   * 更新订单状态
   */
  async updateOrderStatus(
    orderId: string,
    status: Order['status']
  ): Promise<void> {
    const updates: Partial<Order> = { status };

    if (status === 'delivered') {
      updates.deliveredAt = Date.now();
    }

    await this.db.orders.update(orderId, updates);
    console.log(`✅ 订单状态更新: ${status}`);
  }

  // ==================== 配送员管理 ====================

  /**
   * 添加配送员
   */
  async addDriver(driver: DeliveryDriver): Promise<void> {
    await this.db.drivers.insert(driver);
    console.log(`✅ 配送员添加成功: ${driver.name}`);
  }

  /**
   * 更新配送员位置
   */
  async updateDriverLocation(driverId: string, location: Point): Promise<void> {
    await this.db.drivers.update(driverId, {
      currentLocation: location,
      lastUpdate: Date.now()
    });
  }

  /**
   * 获取配送员路线
   */
  async getDriverRoute(driverId: string): Promise<DeliveryRoute | null> {
    return await this.db.routes
      .where('driverId', '=', driverId)
      .where('status', '=', 'in_progress')
      .first();
  }

  /**
   * 获取所有配送员
   */
  async getAllDrivers(): Promise<DeliveryDriver[]> {
    return await this.db.drivers.toArray();
  }

  // ==================== 路径规划 ====================

  /**
   * 规划配送路线
   */
  async planDeliveryRoute(
    driverId: string,
    orderIds: string[]
  ): Promise<DeliveryRoute> {
    console.log(`\n🔄 规划配送路线，订单数: ${orderIds.length}`);

    // 获取订单配送位置
    const orders = await this.db.orders.where('id', 'in', orderIds).toArray();

    if (orders.length === 0) {
      throw new Error('没有找到订单');
    }

    const locations = orders.map(o => o.deliveryLocation);

    // 获取配送员当前位置
    const driver = await this.db.drivers.get(driverId);
    if (!driver) throw new Error('配送员不存在');

    // 求解TSP
    const { route, totalDistance, estimatedTime } = this.tspSolver.solve(
      locations,
      driver.currentLocation
    );

    // 创建路线几何
    const geometry = this.tspSolver.createRouteGeometry(route, driver.currentLocation);

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

    console.log(`✅ 路线规划完成:`);
    console.log(`   总距离: ${formatDistance(totalDistance)}`);
    console.log(`   预计时间: ${formatTime(estimatedTime)}`);

    return routeRecord;
  }

  // ==================== 实时追踪 ====================

  /**
   * 获取配送员追踪信息
   */
  async getDriverTrackingInfo(driverId: string): Promise<TrackingInfo | null> {
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

  // ==================== 效率分析 ====================

  /**
   * 获取配送效率报告
   */
  async getDeliveryEfficiencyReport(
    startTime: number,
    endTime: number
  ): Promise<EfficiencyReport> {
    const orders = await this.db.orders
      .where('createdAt', '>=', startTime)
      .where('createdAt', '<=', endTime)
      .toArray();

    const deliveredOrders = orders.filter(o => o.status === 'delivered');

    const averageDeliveryTime =
      deliveredOrders.length > 0
        ? deliveredOrders.reduce((sum, o) => sum + (o.deliveredAt! - o.createdAt), 0) /
          deliveredOrders.length
        : 0;

    const routes = await this.db.routes
      .where('createdAt', '>=', startTime)
      .where('createdAt', '<=', endTime)
      .where('status', '=', 'completed')
      .toArray();

    const totalDistance = routes.reduce((sum, r) => sum + r.totalDistance, 0);

    return {
      totalOrders: orders.length,
      deliveredOrders: deliveredOrders.length,
      averageDeliveryTime,
      totalDistance,
      driverEfficiency: []
    };
  }

  // ==================== 统计信息 ====================

  /**
   * 获取系统统计信息
   */
  async getSystemStats(): Promise<{
    warehouses: number;
    zones: number;
    orders: number;
    drivers: number;
    routes: number;
  }> {
    const [warehouses, zones, orders, drivers, routes] = await Promise.all([
      this.db.warehouses.count(),
      this.db.deliveryZones.count(),
      this.db.orders.count(),
      this.db.drivers.count(),
      this.db.routes.count()
    ]);

    return {
      warehouses,
      zones,
      orders,
      drivers,
      routes
    };
  }

  /**
   * 打印系统状态
   */
  async printSystemStatus(): Promise<void> {
    const stats = await this.getSystemStats();

    console.log('\n====================');
    console.log('📊 系统状态');
    console.log('====================');
    console.log(`仓库数量: ${stats.warehouses}`);
    console.log(`配送区域: ${stats.zones}`);
    console.log(`订单总数: ${stats.orders}`);
    console.log(`配送员数: ${stats.drivers}`);
    console.log(`路线数量: ${stats.routes}`);
    console.log('====================\n');
  }
}
