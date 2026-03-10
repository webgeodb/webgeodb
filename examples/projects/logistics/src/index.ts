/**
 * 物流配送优化系统 - 主程序入口
 *
 * 演示完整的物流配送流程，包括：
 * 1. 系统初始化
 * 2. 仓库管理和配送区域生成
 * 3. 订单创建和自动分配
 * 4. 配送路线规划
 * 5. 实时位置追踪
 * 6. 效率分析
 */

import { LogisticsDatabase } from './database/LogisticsDatabase.js';
import { LogisticsService } from './services/LogisticsService.js';
import type { Warehouse, DeliveryDriver, Order } from './database/schema.js';

async function main() {
  console.log('\n========================================');
  console.log('🚚 物流配送优化系统演示');
  console.log('========================================\n');

  // ==================== 步骤1: 初始化系统 ====================
  console.log('步骤1: 初始化系统...\n');

  const logisticsDB = new LogisticsDatabase();
  const db = await logisticsDB.init();

  const service = new LogisticsService(db);

  // ==================== 步骤2: 添加仓库 ====================
  console.log('\n步骤2: 添加仓库和配送区域...\n');

  const warehouses: Warehouse[] = [
    {
      id: 'warehouse-beijing',
      name: '北京中心仓',
      address: '北京市朝阳区建国路88号',
      geometry: {
        type: 'Point',
        coordinates: [116.4074, 39.9042]
      },
      capacity: 1000,
      operatingHours: { open: '08:00', close: '22:00' },
      status: 'active'
    },
    {
      id: 'warehouse-shanghai',
      name: '上海中心仓',
      address: '上海市黄浦区南京东路100号',
      geometry: {
        type: 'Point',
        coordinates: [121.4737, 31.2304]
      },
      capacity: 1200,
      operatingHours: { open: '08:00', close: '22:00' },
      status: 'active'
    },
    {
      id: 'warehouse-guangzhou',
      name: '广州中心仓',
      address: '广州市天河区天河路123号',
      geometry: {
        type: 'Point',
        coordinates: [113.2644, 23.1291]
      },
      capacity: 900,
      operatingHours: { open: '08:00', close: '22:00' },
      status: 'active'
    }
  ];

  for (const warehouse of warehouses) {
    await service.addWarehouse(warehouse);
  }

  // ==================== 步骤3: 添加配送员 ====================
  console.log('\n步骤3: 添加配送员...\n');

  const drivers: DeliveryDriver[] = [
    {
      id: 'driver-001',
      name: '张三',
      phone: '13800138001',
      currentLocation: {
        type: 'Point',
        coordinates: [116.4074, 39.9042]
      },
      status: 'available',
      currentLoad: 0,
      maxCapacity: 10,
      lastUpdate: Date.now()
    },
    {
      id: 'driver-002',
      name: '李四',
      phone: '13800138002',
      currentLocation: {
        type: 'Point',
        coordinates: [116.4100, 39.9070]
      },
      status: 'available',
      currentLoad: 0,
      maxCapacity: 10,
      lastUpdate: Date.now()
    },
    {
      id: 'driver-003',
      name: '王五',
      phone: '13800138003',
      currentLocation: {
        type: 'Point',
        coordinates: [116.4150, 39.9100]
      },
      status: 'available',
      currentLoad: 0,
      maxCapacity: 10,
      lastUpdate: Date.now()
    },
    {
      id: 'driver-004',
      name: '赵六',
      phone: '13800138004',
      currentLocation: {
        type: 'Point',
        coordinates: [121.4737, 31.2304]
      },
      status: 'available',
      currentLoad: 0,
      maxCapacity: 10,
      lastUpdate: Date.now()
    }
  ];

  for (const driver of drivers) {
    await service.addDriver(driver);
  }

  // ==================== 步骤4: 创建订单 ====================
  console.log('\n步骤4: 创建订单...\n');

  const orders: Omit<Order, 'id' | 'createdAt' | 'status'>[] = [
    {
      customerId: 'customer-001',
      items: [{ productId: 'product-001', quantity: 2 }],
      pickupLocation: {
        type: 'Point',
        coordinates: [116.4074, 39.9042]
      },
      deliveryLocation: {
        type: 'Point',
        coordinates: [116.4174, 39.9142]
      },
      priority: 'normal'
    },
    {
      customerId: 'customer-002',
      items: [{ productId: 'product-002', quantity: 1 }],
      pickupLocation: {
        type: 'Point',
        coordinates: [116.4074, 39.9042]
      },
      deliveryLocation: {
        type: 'Point',
        coordinates: [116.4200, 39.9150]
      },
      priority: 'high'
    },
    {
      customerId: 'customer-003',
      items: [{ productId: 'product-003', quantity: 3 }],
      pickupLocation: {
        type: 'Point',
        coordinates: [116.4074, 39.9042]
      },
      deliveryLocation: {
        type: 'Point',
        coordinates: [116.4120, 39.9080]
      },
      priority: 'normal'
    },
    {
      customerId: 'customer-004',
      items: [{ productId: 'product-004', quantity: 1 }],
      pickupLocation: {
        type: 'Point',
        coordinates: [116.4074, 39.9042]
      },
      deliveryLocation: {
        type: 'Point',
        coordinates: [116.4180, 39.9120]
      },
      priority: 'normal'
    },
    {
      customerId: 'customer-005',
      items: [{ productId: 'product-005', quantity: 2 }],
      pickupLocation: {
        type: 'Point',
        coordinates: [116.4074, 39.9042]
      },
      deliveryLocation: {
        type: 'Point',
        coordinates: [116.4190, 39.9160]
      },
      priority: 'low'
    }
  ];

  const orderIds: string[] = [];
  for (const order of orders) {
    const orderId = await service.createOrder(order);
    orderIds.push(orderId);
  }

  // 等待一下，让订单分配完成
  await new Promise(resolve => setTimeout(resolve, 1000));

  // ==================== 步骤5: 查看订单状态 ====================
  console.log('\n步骤5: 查看订单分配状态...\n');

  for (const orderId of orderIds) {
    const order = await db.orders.get(orderId);
    if (order) {
      console.log(`订单 ${orderId.slice(0, 8)}:`);
      console.log(`  状态: ${order.status}`);
      console.log(`  优先级: ${order.priority}`);
      console.log(`  分配时间: ${order.assignedAt ? new Date(order.assignedAt).toLocaleString() : '未分配'}`);
      console.log(`  预计送达: ${order.estimatedDeliveryTime || 0} 分钟`);
      console.log('');
    }
  }

  // ==================== 步骤6: 规划配送路线 ====================
  console.log('\n步骤6: 规划配送路线...\n');

  // 获取已分配的订单
  const assignedOrders = await db.orders
    .where('status', '=', 'assigned')
    .limit(5)
    .toArray();

  if (assignedOrders.length > 0) {
    // 找一个可用的配送员
    const driver = await db.drivers.where('status', '=', 'available').first();

    if (driver) {
      try {
        const route = await service.planDeliveryRoute(
          driver.id,
          assignedOrders.map(o => o.id)
        );

        console.log(`\n✅ 路线规划完成:`);
        console.log(`   路线ID: ${route.id.slice(0, 8)}`);
        console.log(`   配送员: ${driver.name}`);
        console.log(`   订单数: ${route.orderIds.length}`);
        console.log(`   总距离: ${(route.totalDistance / 1000).toFixed(2)} km`);
        console.log(`   预计时间: ${(route.estimatedTime / 60).toFixed(0)} 分钟`);
      } catch (error) {
        console.error(`❌ 路线规划失败:`, error);
      }
    }
  }

  // ==================== 步骤7: 实时追踪 ====================
  console.log('\n步骤7: 实时追踪演示...\n');

  const allDrivers = await service.getAllDrivers();

  for (const driver of allDrivers.slice(0, 2)) {
    const trackingInfo = await service.getDriverTrackingInfo(driver.id);

    if (trackingInfo) {
      console.log(`配送员: ${trackingInfo.driver.name}`);
      console.log(`  状态: ${trackingInfo.driver.status}`);
      console.log(`  当前负载: ${trackingInfo.driver.currentLoad}/${trackingInfo.driver.maxCapacity}`);
      console.log(`  当前位置: [${trackingInfo.driver.currentLocation.coordinates.join(', ')}]`);

      if (trackingInfo.currentRoute) {
        console.log(`  当前路线: ${trackingInfo.currentRoute.orderIds.length} 个订单`);
      }

      if (trackingInfo.nearbyOrders && trackingInfo.nearbyOrders.length > 0) {
        console.log(`  附近订单: ${trackingInfo.nearbyOrders.length} 个`);
      }

      console.log('');
    }
  }

  // ==================== 步骤8: 系统统计 ====================
  console.log('\n步骤8: 系统统计信息...\n');

  await service.printSystemStatus();

  // ==================== 完成 ====================
  console.log('\n========================================');
  console.log('✅ 演示完成！');
  console.log('========================================\n');

  // 关闭数据库
  await logisticsDB.close();

  console.log('感谢使用物流配送优化系统！\n');
}

// 错误处理
main().catch(error => {
  console.error('\n❌ 程序执行出错:', error.message);
  console.error('\n堆栈跟踪:');
  console.error(error.stack);
  process.exit(1);
});
