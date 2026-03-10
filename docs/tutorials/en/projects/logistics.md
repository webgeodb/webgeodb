# Logistics Delivery Optimization System

> **Learning Time**: 120-150 minutes | **Difficulty**: Advanced | **Prerequisites**: Chapters 1-4

## Project Overview

The Logistics Delivery Optimization System is an intelligent logistics management application built with WebGeoDB that demonstrates how to solve real-world logistics delivery problems using geospatial data. The system uses Voronoi diagrams to partition delivery areas, route optimization algorithms to plan optimal delivery routes, and provides real-time location tracking and dynamic order allocation.

### Core Features

1. **Voronoi Diagram Generation**: Automatically partition delivery areas based on warehouse/distribution center locations
2. **Route Planning**: Plan optimal delivery routes for delivery drivers (TSP problem solving)
3. **Real-time Tracking**: Track driver locations and delivery status
4. **Order Allocation**: Intelligently assign orders to the nearest available driver
5. **Efficiency Analysis**: Analyze delivery efficiency and optimize delivery strategies

### Technical Highlights

- **Voronoi Diagram Algorithm**: Implement point-based area partitioning
- **TSP Solver**: Traveling Salesman Problem solver for route optimization
- **Real-time Location Tracking**: Combine with Geolocation API for driver tracking
- **Spatial Index Optimization**: Leverage WebGeoDB spatial indexes for fast queries
- **Visualization**: Display delivery areas, routes, and real-time locations on maps

### Application Scenarios

- Food delivery platforms
- Express delivery companies
- Local service delivery
- Supply chain management

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│              Presentation Layer                 │
│  (Map visualization, order management,          │
│   real-time monitoring dashboard)               │
├─────────────────────────────────────────────────┤
│              Business Logic Layer               │
│  (Route planning, order allocation,             │
│   delivery management)                          │
├─────────────────────────────────────────────────┤
│              Data Access Layer                  │
│  (Warehouse management, order management,       │
│   driver management)                            │
├─────────────────────────────────────────────────┤
│              WebGeoDB                            │
│  (Spatial data storage, spatial queries,        │
│   spatial indexing)                             │
└─────────────────────────────────────────────────┘
```

---

## Data Model Design

### 1. Warehouses

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

### 2. Delivery Zones

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

### 3. Orders

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

### 4. Delivery Drivers

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

### 5. Delivery Routes

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

## Core Algorithm Implementation

### 1. Voronoi Diagram Generation

A Voronoi diagram partitions a plane into regions where each region contains all points closest to its seed point.

**Algorithm Implementation:**

```typescript
class VoronoiDiagramGenerator {
  /**
   * Generate Voronoi diagram
   * @param seeds Seed points (warehouse locations)
   * @param bounds Boundary range
   * @returns Array of Voronoi polygons
   */
  generate(
    seeds: Point[],
    bounds: [number, number, number, number]
  ): Array<{ seed: Point; polygon: Polygon }> {
    const [minX, minY, maxX, maxY] = bounds;
    const cells: Array<{ seed: Point; polygon: Polygon }> = [];

    // Generate grid
    const cellSize = 0.001; // ~100 meters
    const grid = this.createGrid(bounds, cellSize);

    // Assign nearest seed to each grid point
    const seedCells = new Map<number, Array<[number, number]>>();

    for (const point of grid) {
      const nearestSeed = this.findNearestSeed(point, seeds);
      const seedIndex = seeds.indexOf(nearestSeed);

      if (!seedCells.has(seedIndex)) {
        seedCells.set(seedIndex, []);
      }
      seedCells.get(seedIndex)!.push(point);
    }

    // Generate convex hull for each seed
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
   * Create grid points
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
   * Find nearest seed point
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
   * Calculate distance between two points (meters)
   */
  private calculateDistance(
    from: [number, number],
    to: [number, number]
  ): number {
    const R = 6371e3; // Earth radius
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
   * Generate concave hull (alpha shape)
   */
  private concaveHull(
    points: Array<[number, number]>,
    alpha: number
  ): Polygon {
    // Simplified: use convex hull algorithm
    // In production, use more sophisticated concave hull algorithm
    return this.convexHull(points);
  }

  /**
   * Generate convex hull (Graham scan)
   */
  private convexHull(points: Array<[number, number]>): Polygon {
    if (points.length < 3) {
      return {
        type: 'Polygon',
        coordinates: [[...points, points[0]]]
      };
    }

    // Find bottom-most point
    let bottom = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i][1] < points[bottom][1] ||
        (points[i][1] === points[bottom][1] && points[i][0] < points[bottom][0])) {
        bottom = i;
      }
    }

    // Sort by polar angle
    const sorted = points.slice();
    const pivot = sorted[bottom];
    sorted.splice(bottom, 1);

    sorted.sort((a, b) => {
      const angleA = Math.atan2(a[1] - pivot[1], a[0] - pivot[0]);
      const angleB = Math.atan2(b[1] - pivot[1], b[0] - pivot[0]);
      return angleA - angleB;
    });

    // Graham scan
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
   * Clip to bounds
   */
  private clipToBounds(
    polygon: Polygon,
    bounds: [number, number, number, number]
  ): Polygon {
    // Use Sutherland-Hodgman algorithm for polygon clipping
    const [minX, minY, maxX, maxY] = bounds;
    const result = polygon.coordinates[0];

    // Clip to bounds (simplified implementation)
    // In production, implement complete clipping algorithm

    return {
      type: 'Polygon',
      coordinates: [result]
    };
  }
}
```

### 2. Route Planning (TSP Solver)

Use nearest neighbor algorithm and 2-opt optimization to solve the Traveling Salesman Problem.

**Algorithm Implementation:**

```typescript
class TSPSolver {
  /**
   * Solve TSP problem
   * @param points Points to visit
   * @param startPoint Starting point
   * @returns Optimal route
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

    // Generate initial solution using nearest neighbor
    let route = this.nearestNeighbor(points, startPoint);
    let totalDistance = this.calculateRouteDistance(route);

    // Optimize using 2-opt
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
   * Nearest neighbor algorithm
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
   * 2-opt swap
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
   * Calculate total route distance
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
   * Calculate distance between two points
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
   * Estimate delivery time (assuming average speed 30km/h)
   */
  estimateTime(distance: number): number {
    const averageSpeed = 30 * 1000 / 3600; // 30km/h to m/s
    return distance / averageSpeed; // seconds
  }
}
```

### 3. Order Allocation Algorithm

Intelligent order allocation based on distance and driver load.

**Algorithm Implementation:**

```typescript
class OrderAllocator {
  private db: WebGeoDB;

  constructor(db: WebGeoDB) {
    this.db = db;
  }

  /**
   * Allocate order to optimal driver
   */
  async allocateOrder(orderId: string): Promise<{
    driverId: string;
    estimatedTime: number;
  } | null> {
    // Get order info
    const order = await this.db.orders.get(orderId);
    if (!order || order.status !== 'pending') {
      return null;
    }

    // Find available drivers
    const availableDrivers = await this.db.drivers
      .where('status', '=', 'available')
      .where('currentLoad', '<=', this.db.drivers.getField('maxCapacity'))
      .toArray();

    if (availableDrivers.length === 0) {
      return null;
    }

    // Calculate score for each driver
    const scores = await Promise.all(
      availableDrivers.map(async (driver) => {
        const distance = this.calculateDistance(
          driver.currentLocation.coordinates,
          order.pickupLocation.coordinates
        );

        const loadScore = 1 - (driver.currentLoad / driver.maxCapacity);
        const distanceScore = 1 / (1 + distance / 1000); // normalize

        return {
          driver,
          score: loadScore * 0.3 + distanceScore * 0.7,
          distance
        };
      })
    );

    // Select highest scoring driver
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    // Update order status
    await this.db.orders.update(orderId, {
      status: 'assigned',
      assignedAt: Date.now()
    });

    // Update driver status
    await this.db.drivers.update(best.driver.id, {
      status: 'busy',
      currentLoad: best.driver.currentLoad + 1
    });

    // Estimate delivery time
    const estimatedTime = Math.ceil(best.distance / 500 * 60); // assume 500m/min

    return {
      driverId: best.driver.id,
      estimatedTime
    };
  }

  /**
   * Batch allocate orders
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
   * Find nearest driver
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

    // Sort by distance
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
   * Calculate distance
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

## Complete Implementation

### Database Initialization

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

    // Define schema
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

    // Create spatial indexes
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

### Service Layer

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

  // === Warehouse Management ===

  async addWarehouse(warehouse: Warehouse): Promise<void> {
    await this.db.warehouses.insert(warehouse);

    // Regenerate delivery zones
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

  // === Delivery Zone Management ===

  async regenerateDeliveryZones(): Promise<void> {
    // Get all active warehouses
    const warehouses = await this.db.warehouses
      .where('status', '=', 'active')
      .toArray();

    if (warehouses.length === 0) return;

    // Calculate bounds
    const bounds = this.calculateBounds(warehouses.map(w => w.geometry));

    // Generate Voronoi diagram
    const cells = this.voronoiGenerator.generate(
      warehouses.map(w => w.geometry),
      bounds
    );

    // Clear old zones
    await this.db.deliveryZones.clear();

    // Create new zones
    for (const cell of cells) {
      const warehouse = warehouses.find(w =>
        w.geometry.coordinates[0] === cell.seed.coordinates[0] &&
        w.geometry.coordinates[1] === cell.seed.coordinates[1]
      );

      if (warehouse) {
        await this.db.deliveryZones.insert({
          id: crypto.randomUUID(),
          warehouseId: warehouse.id,
          name: `${warehouse.name} Delivery Zone`,
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

  // === Order Management ===

  async createOrder(order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const newOrder: Order = {
      ...order,
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: Date.now()
    };

    await this.db.orders.insert(newOrder);

    // Auto allocate order
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

  // === Driver Management ===

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

  // === Route Planning ===

  async planDeliveryRoute(
    driverId: string,
    orderIds: string[]
  ): Promise<DeliveryRoute> {
    // Get order delivery locations
    const orders = await this.db.orders
      .where('id', 'in', orderIds)
      .toArray();

    const locations = orders.map(o => o.deliveryLocation);

    // Get driver current location
    const driver = await this.db.drivers.get(driverId);
    if (!driver) throw new Error('Driver not found');

    // Solve TSP
    const { route, totalDistance } = this.tspSolver.solve(
      locations,
      driver.currentLocation
    );

    // Estimate time
    const estimatedTime = this.tspSolver.estimateTime(totalDistance);

    // Create route geometry
    const geometry: LineString = {
      type: 'LineString',
      coordinates: [
        driver.currentLocation.coordinates,
        ...route.map(p => p.coordinates)
      ]
    };

    // Save route
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

  // === Real-time Tracking ===

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

  // === Efficiency Analysis ===

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

## Usage Examples

### Initialize System

```typescript
async function initializeLogisticsSystem() {
  // Initialize database
  const logisticsDB = new LogisticsDatabase();
  const db = await logisticsDB.init();

  // Initialize service
  const logisticsService = new LogisticsService(db);

  // Add warehouses
  await logisticsService.addWarehouse({
    id: 'warehouse-1',
    name: 'Beijing Center Warehouse',
    address: 'Chaoyang District, Beijing',
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
    name: 'Shanghai Center Warehouse',
    address: 'Huangpu District, Shanghai',
    geometry: {
      type: 'Point',
      coordinates: [121.4737, 31.2304]
    },
    capacity: 1200,
    operatingHours: { open: '08:00', close: '22:00' },
    status: 'active'
  });

  console.log('✅ Logistics system initialized');

  return logisticsService;
}
```

### Create Order and Auto Allocate

```typescript
async function createAndAllocateOrder(service: LogisticsService) {
  // Create order
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

  console.log(`✅ Order created: ${orderId}`);

  // Get order details
  const order = await service.db.orders.get(orderId);
  console.log('Order status:', order?.status);
  console.log('Estimated delivery time:', order?.estimatedDeliveryTime, 'minutes');

  return orderId;
}
```

### Plan Delivery Route

```typescript
async function planDeliveryRoute(service: LogisticsService) {
  // Get pending orders
  const pendingOrders = await service.db.orders
    .where('status', '=', 'assigned')
    .limit(10)
    .toArray();

  if (pendingOrders.length === 0) {
    console.log('No pending orders');
    return;
  }

  // Select a driver
  const driver = await service.db.drivers
    .where('status', '=', 'available')
    .first();

  if (!driver) {
    console.log('No available drivers');
    return;
  }

  // Plan route
  const route = await service.planDeliveryRoute(
    driver.id,
    pendingOrders.map(o => o.id)
  );

  console.log(`✅ Route planned`);
  console.log(`Total distance: ${(route.totalDistance / 1000).toFixed(2)} km`);
  console.log(`Estimated time: ${(route.estimatedTime / 60).toFixed(0)} minutes`);
}
```

### Real-time Tracking

```typescript
async function trackDriver(service: LogisticsService, driverId: string) {
  // Update driver location
  await service.updateDriverLocation(driverId, {
    type: 'Point',
    coordinates: [116.4100, 39.9100]
  });

  // Get tracking info
  const trackingInfo = await service.getDriverTrackingInfo(driverId);

  if (trackingInfo) {
    console.log('Driver:', trackingInfo.driver.name);
    console.log('Status:', trackingInfo.driver.status);
    console.log('Current location:', trackingInfo.driver.currentLocation.coordinates);

    if (trackingInfo.currentRoute) {
      console.log('Current route:', trackingInfo.currentRoute.orderIds);
    }

    if (trackingInfo.nearbyOrders) {
      console.log('Nearby orders:', trackingInfo.nearbyOrders.length);
    }
  }
}
```

---

## Map Visualization

### Using Leaflet

```typescript
import L from 'leaflet';

class LogisticsMapVisualizer {
  private map: L.Map;
  private service: LogisticsService;

  constructor(mapId: string, service: LogisticsService) {
    this.service = service;

    // Initialize map
    this.map = L.map(mapId).setView([39.9042, 116.4074], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  /**
   * Display warehouses and delivery zones
   */
  async displayWarehousesAndZones() {
    const warehouses = await this.service.db.warehouses.toArray();
    const zones = await this.service.db.deliveryZones.toArray();

    // Display delivery zones
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

    // Display warehouses
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
          Capacity: ${warehouse.capacity}
        `)
        .addTo(this.map);
    });
  }

  /**
   * Display driver locations
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
          Status: ${driver.status}<br>
          Current load: ${driver.currentLoad}/${driver.maxCapacity}
        `)
        .addTo(this.map);
    });
  }

  /**
   * Display delivery route
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
        <b>Delivery Route</b><br>
        Distance: ${(route.totalDistance / 1000).toFixed(2)} km<br>
        Estimated time: ${(route.estimatedTime / 60).toFixed(0)} minutes<br>
        Orders: ${route.orderIds.length}
      `)
      .addTo(this.map);

    // Display order points
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
          .bindPopup(`<b>Order ${orderId.slice(0, 8)}</b>`)
          .addTo(this.map);
      }
    }
  }

  /**
   * Display orders
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
          <b>Order ${order.id.slice(0, 8)}</b><br>
          Status: ${order.status}<br>
          Priority: ${order.priority}
        `)
        .addTo(this.map);
    });
  }
}

// Usage
async function visualizeLogistics() {
  const service = await initializeLogisticsSystem();
  const visualizer = new LogisticsMapVisualizer('map', service);

  // Display all data
  await visualizer.displayWarehousesAndZones();
  await visualizer.displayDrivers();
  await visualizer.displayOrders();
}
```

---

## Testing Examples

### Unit Tests

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
      // Add warehouses
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

      // Check zone generation
      const zones = await db.deliveryZones.toArray();
      expect(zones.length).toBe(2);

      // Verify zone geometry
      expect(zones[0].geometry.type).toBe('Polygon');
      expect(zones[0].geometry.coordinates.length).toBeGreaterThan(0);
    });
  });

  describe('Order Allocation', () => {
    it('should allocate order to nearest driver', async () => {
      // Add driver
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

      // Create order
      const orderId = await service.createOrder({
        customerId: 'customer1',
        items: [{ productId: 'p1', quantity: 1 }],
        pickupLocation: { type: 'Point', coordinates: [116.4074, 39.9042] },
        deliveryLocation: { type: 'Point', coordinates: [116.4100, 39.9070] },
        priority: 'normal'
      });

      // Check order status
      const order = await db.orders.get(orderId);
      expect(order?.status).toBe('assigned');
      expect(order?.assignedAt).toBeDefined();
    });
  });

  describe('Route Planning', () => {
    it('should plan optimal route for multiple orders', async () => {
      // Create multiple orders
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

      // Add driver
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

      // Plan route
      const route = await service.planDeliveryRoute('driver1', orderIds);

      // Verify route
      expect(route.orderIds.length).toBe(5);
      expect(route.totalDistance).toBeGreaterThan(0);
      expect(route.estimatedTime).toBeGreaterThan(0);
      expect(route.geometry.type).toBe('LineString');
    });
  });
});
```

---

## Performance Optimization

### 1. Spatial Index Optimization

```typescript
// Create composite indexes for common queries
db.orders.createIndex(['status', 'createdAt']);
db.drivers.createIndex(['status', 'currentLoad']);
```

### 2. Batch Operations

```typescript
// Bulk insert orders
async function bulkCreateOrders(orders: Omit<Order, 'id' | 'createdAt'>[]) {
  const ordersWithIds = orders.map(order => ({
    ...order,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    status: 'pending' as const
  }));

  await db.orders.bulkPut(ordersWithIds);

  // Batch allocate
  const allocator = new OrderAllocator(db);
  await allocator.allocateBatchOrders(ordersWithIds.map(o => o.id));
}
```

### 3. Query Optimization

```typescript
// Use limit to restrict results
const recentOrders = await db.orders
  .orderBy('createdAt', 'desc')
  .limit(100)
  .toArray();

// Use pagination
async function getPaginatedOrders(page: number, pageSize: number) {
  return await db.orders
    .orderBy('createdAt', 'desc')
    .offset(page * pageSize)
    .limit(pageSize)
    .toArray();
}
```

---

## Extended Features

### 1. Delivery Time Prediction

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
    // Get historical data
    const historicalDeliveries = await this.db.routes
      .where('createdAt', '>', Date.now() - 30 * 24 * 3600 * 1000) // Last 30 days
      .toArray();

    // Calculate average time for similar routes
    // Simplified implementation, should use more sophisticated prediction model

    const distance = this.calculateDistance(
      pickupLocation.coordinates,
      deliveryLocation.coordinates
    );

    const baseTime = distance / 500 * 60; // Assume 500m/min

    // Consider time of day factor
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

### 2. Dynamic Zone Adjustment

```typescript
async function adjustZonesBasedOnDemand(service: LogisticsService) {
  // Analyze order density
  const orders = await service.db.orders
    .where('createdAt', '>', Date.now() - 7 * 24 * 3600 * 1000) // Last 7 days
    .toArray();

  // Calculate order density for each zone
  const zones = await service.db.deliveryZones.toArray();

  for (const zone of zones) {
    const ordersInZone = orders.filter(order =>
      service.db.orders.intersects('deliveryLocation', zone.geometry)
    );

    // If too many orders, consider reducing zone size or adding warehouse
    if (ordersInZone.length > 1000) {
      console.log(`Zone ${zone.name} has high order density, consider adjustment`);
    }
  }
}
```

---

## Summary

This tutorial demonstrates how to build a complete logistics delivery optimization system using WebGeoDB, covering:

### Key Technical Points

- ✅ **Voronoi Diagram Algorithm**: Automatic delivery zone partitioning
- ✅ **TSP Solver**: Optimize delivery routes
- ✅ **Intelligent Allocation**: Distance and load-based order allocation
- ✅ **Real-time Tracking**: Driver location and status tracking
- ✅ **Spatial Indexing**: Accelerate geographic queries
- ✅ **Map Visualization**: Intuitive display of delivery data

### Business Value

- Improve delivery efficiency
- Reduce operational costs
- Enhance customer satisfaction
- Optimize resource allocation

### Next Steps

- Integrate real map APIs (Google Maps, Mapbox)
- Add real-time traffic data
- Implement machine learning prediction models
- Develop mobile applications

---

## References

- **[Voronoi Diagram](https://en.wikipedia.org/wiki/Voronoi_diagram)** - Voronoi diagram principles
- **[TSP Problem](https://en.wikipedia.org/wiki/Travelling_salesman_problem)** - Traveling Salesman Problem
- **[2-opt Algorithm](https://en.wikipedia.org/wiki/2-opt)** - Route optimization algorithm
- **[WebGeoDB API](../../api/reference.md)** - Complete WebGeoDB API documentation
- **[Example Code](https://github.com/zhyt1985/webgeodb/tree/main/examples/projects/logistics)** - Complete example code
