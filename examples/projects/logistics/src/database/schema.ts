/**
 * 物流配送优化系统 - 数据模型定义
 *
 * 定义了系统中使用的所有数据结构和接口
 */

/**
 * GeoJSON几何对象类型
 */
export type Point = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

export type Polygon = {
  type: 'Polygon';
  coordinates: Array<Array<[number, number]>>;
};

export type LineString = {
  type: 'LineString';
  coordinates: Array<[number, number]>;
};

/**
 * 仓库
 */
export interface Warehouse {
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

/**
 * 配送区域
 */
export interface DeliveryZone {
  id: string;
  warehouseId: string;
  name: string;
  geometry: Polygon;
  priority: number;
  averageDeliveryTime: number;
}

/**
 * 订单
 */
export interface Order {
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

/**
 * 配送员
 */
export interface DeliveryDriver {
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

/**
 * 配送路线
 */
export interface DeliveryRoute {
  id: string;
  driverId: string;
  orderIds: string[];
  geometry: LineString;
  totalDistance: number;
  estimatedTime: number;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: number;
}

/**
 * 配送效率报告
 */
export interface EfficiencyReport {
  totalOrders: number;
  deliveredOrders: number;
  averageDeliveryTime: number;
  totalDistance: number;
  driverEfficiency: Array<{
    driverId: string;
    deliveries: number;
    averageTime: number;
  }>;
}

/**
 * 追踪信息
 */
export interface TrackingInfo {
  driver: DeliveryDriver;
  currentRoute?: DeliveryRoute;
  nearbyOrders?: Order[];
}
