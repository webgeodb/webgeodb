/**
 * 订单分配算法
 *
 * 基于距离和配送员负载智能分配订单
 */

import type { WebGeoDB } from '@webgeodb/core';
import type { Order, DeliveryDriver, Point } from '../database/schema.js';
import { calculateDistance } from '../utils/geometry.js';

export interface AllocationResult {
  driverId: string;
  estimatedTime: number;
  distance: number;
}

export interface DriverScore {
  driver: DeliveryDriver;
  score: number;
  distance: number;
  loadScore: number;
  distanceScore: number;
}

/**
 * 订单分配器类
 */
export class OrderAllocator {
  constructor(private db: WebGeoDB) {}

  /**
   * 分配订单给最优配送员
   *
   * @param orderId - 订单ID
   * @param maxDistance - 最大搜索距离（米），默认5000
   * @returns 分配结果
   */
  async allocateOrder(
    orderId: string,
    maxDistance: number = 5000
  ): Promise<AllocationResult | null> {
    // 获取订单信息
    const order = await this.db.orders.get(orderId);

    if (!order) {
      console.error(`❌ 订单不存在: ${orderId}`);
      return null;
    }

    if (order.status !== 'pending') {
      console.warn(`⚠️ 订单状态不是pending: ${order.status}`);
      return null;
    }

    console.log(`🔄 开始分配订单: ${orderId.slice(0, 8)}`);

    // 查找附近的可用配送员
    const nearbyDrivers = await this.findAvailableDrivers(
      order.pickupLocation,
      maxDistance
    );

    if (nearbyDrivers.length === 0) {
      console.warn(`⚠️ 附近没有可用配送员`);
      return null;
    }

    console.log(`✅ 找到 ${nearbyDrivers.length} 个可用配送员`);

    // 计算每个配送员的得分
    const scores = await this.calculateDriverScores(nearbyDrivers, order);

    // 选择得分最高的配送员
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    console.log(`✅ 选择配送员: ${best.driver.name}，得分: ${best.score.toFixed(2)}`);

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
    const estimatedTime = Math.ceil(best.distance / 500); // 假设500m/min

    console.log(`✅ 订单分配完成，预计时间: ${estimatedTime}分钟`);

    return {
      driverId: best.driver.id,
      estimatedTime,
      distance: best.distance
    };
  }

  /**
   * 批量分配订单
   *
   * @param orderIds - 订单ID数组
   * @returns 分配结果映射（orderId -> driverId）
   */
  async allocateBatchOrders(orderIds: string[]): Promise<Map<string, string>> {
    console.log(`🔄 批量分配订单，数量: ${orderIds.length}`);

    const allocations = new Map<string, string>();

    for (const orderId of orderIds) {
      const result = await this.allocateOrder(orderId);
      if (result) {
        allocations.set(orderId, result.driverId);
      }
    }

    console.log(`✅ 批量分配完成，成功: ${allocations.size}/${orderIds.length}`);

    return allocations;
  }

  /**
   * 查找附近的可用配送员
   */
  private async findAvailableDrivers(
    location: Point,
    maxDistance: number
  ): Promise<DeliveryDriver[]> {
    // 使用空间查询查找附近配送员
    const nearby = await this.db.drivers
      .distance('currentLocation', location.coordinates, '<', maxDistance)
      .where('status', '=', 'available')
      .toArray();

    // 过滤掉负载已满的配送员
    return nearby.filter(driver => driver.currentLoad < driver.maxCapacity);
  }

  /**
   * 计算配送员得分
   *
   * 综合考虑距离和负载
   */
  private async calculateDriverScores(
    drivers: DeliveryDriver[],
    order: Order
  ): Promise<DriverScore[]> {
    const scores: DriverScore[] = [];

    for (const driver of drivers) {
      const distance = calculateDistance(
        driver.currentLocation.coordinates,
        order.pickupLocation.coordinates
      );

      // 负载得分（负载越小越好）
      const loadScore = 1 - driver.currentLoad / driver.maxCapacity;

      // 距离得分（距离越近越好）
      const distanceScore = 1 / (1 + distance / 1000); // 归一化

      // 综合得分（距离权重70%，负载权重30%）
      const score = loadScore * 0.3 + distanceScore * 0.7;

      scores.push({
        driver,
        score,
        distance,
        loadScore,
        distanceScore
      });
    }

    return scores;
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
      const distA = calculateDistance(
        a.currentLocation.coordinates,
        location.coordinates
      );
      const distB = calculateDistance(
        b.currentLocation.coordinates,
        location.coordinates
      );
      return distA - distB;
    });

    return nearby[0];
  }

  /**
   * 自动分配待处理订单
   *
   * 定期调用此方法以自动分配所有待处理订单
   */
  async autoAllocatePendingOrders(): Promise<number> {
    console.log(`🔄 开始自动分配待处理订单`);

    const pendingOrders = await this.db.orders
      .where('status', '=', 'pending')
      .toArray();

    if (pendingOrders.length === 0) {
      console.log(`✅ 没有待处理订单`);
      return 0;
    }

    const allocations = await this.allocateBatchOrders(
      pendingOrders.map(o => o.id)
    );

    return allocations.size;
  }

  /**
   * 释放配送员（订单完成后调用）
   */
  async releaseDriver(driverId: string): Promise<void> {
    const driver = await this.db.drivers.get(driverId);

    if (!driver) {
      console.error(`❌ 配送员不存在: ${driverId}`);
      return;
    }

    await this.db.drivers.update(driverId, {
      status: 'available',
      currentLoad: Math.max(0, driver.currentLoad - 1)
    });

    console.log(`✅ 配送员已释放: ${driver.name}`);
  }

  /**
   * 获取区域统计信息
   */
  async getZoneStatistics(zoneId?: string): Promise<{
    totalDrivers: number;
    availableDrivers: number;
    averageLoad: number;
  }> {
    let drivers;

    if (zoneId) {
      drivers = await this.db.drivers.where('zoneId', '=', zoneId).toArray();
    } else {
      drivers = await this.db.drivers.toArray();
    }

    const availableDrivers = drivers.filter(d => d.status === 'available');
    const totalLoad = drivers.reduce((sum, d) => sum + d.currentLoad, 0);
    const averageLoad = drivers.length > 0 ? totalLoad / drivers.length : 0;

    return {
      totalDrivers: drivers.length,
      availableDrivers: availableDrivers.length,
      averageLoad
    };
  }
}
