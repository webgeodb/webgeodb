/**
 * 物流配送优化系统 - 数据库初始化
 *
 * 初始化WebGeoDB数据库，定义表结构和索引
 */

import { WebGeoDB } from '@webgeodb/core';
import type {
  Warehouse,
  DeliveryZone,
  Order,
  DeliveryDriver,
  DeliveryRoute
} from './schema.js';

export class LogisticsDatabase {
  private db: WebGeoDB | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<WebGeoDB> {
    this.db = new WebGeoDB({
      name: 'logistics-system',
      version: 1
    });

    await this.db.open();

    // 定义表结构
    this.defineSchema();

    // 创建索引
    this.createIndexes();

    console.log('✅ 数据库初始化完成');

    return this.db;
  }

  /**
   * 定义表结构
   */
  private defineSchema(): void {
    if (!this.db) throw new Error('Database not initialized');

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

    console.log('✅ 表结构定义完成');
  }

  /**
   * 创建空间索引和复合索引
   */
  private createIndexes(): void {
    if (!this.db) throw new Error('Database not initialized');

    // 空间索引
    this.db.warehouses.createIndex('geometry');
    this.db.deliveryZones.createIndex('geometry');
    this.db.orders.createIndex('pickupLocation');
    this.db.orders.createIndex('deliveryLocation');
    this.db.drivers.createIndex('currentLocation');
    this.db.routes.createIndex('geometry');

    // 复合索引
    this.db.orders.createIndex(['status', 'createdAt']);
    this.db.drivers.createIndex(['status', 'currentLoad']);

    console.log('✅ 索引创建完成');
  }

  /**
   * 获取数据库实例
   */
  getDB(): WebGeoDB {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('✅ 数据库已关闭');
    }
  }

  /**
   * 清空所有数据（用于测试）
   */
  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.warehouses.clear();
    await this.db.deliveryZones.clear();
    await this.db.orders.clear();
    await this.db.drivers.clear();
    await this.db.routes.clear();

    console.log('✅ 数据已清空');
  }
}
