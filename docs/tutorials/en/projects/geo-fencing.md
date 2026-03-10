# E-commerce Geo-fencing Marketing System

> **Level**: Intermediate | **Time**: 60-90 minutes | **Tech Stack**: TypeScript, WebGeoDB, Leaflet

## Project Overview

The E-commerce Geo-fencing Marketing System is a complete end-to-end application example that demonstrates how to build a production-grade location-based marketing platform using WebGeoDB. This system covers core functionality including geo-fence management, real-time location tracking, marketing rule engine, and heatmap analytics.

### Use Cases

- 🛒 **Retail Marketing**: Automatically push coupons when users enter a store geo-fence
- 🚚 **Delivery Services**: Detect if users are within delivery range, dynamically calculate delivery fees
- 📊 **User Behavior Analytics**: Analyze user dwell time and visit frequency across different geo-fences
- 🔥 **Heatmap Visualization**: Generate user distribution heatmaps based on location data

### Core Features

1. **Geo-fence Management**: Create, edit, and delete polygon geo-fences
2. **Real-time Location Detection**: Determine if users are within geo-fences, calculate dwell time
3. **Marketing Rule Engine**: Configure enter/exit/dwell trigger rules
4. **Data Analytics and Visualization**: Generate statistics and heatmaps
5. **Map Visualization**: Interactive map interface based on Leaflet

---

## Learning Objectives

By completing this tutorial, you will be able to:

1. Design and implement a complete location-based marketing system architecture
2. Use WebGeoDB for spatial data storage and querying
3. Implement real-time location tracking and event detection
4. Build a flexible marketing rule engine
5. Integrate Leaflet maps for visualization
6. Generate heatmaps and statistical reports

---

## System Architecture

### Architecture Design

The system uses a layered architecture:

```
┌─────────────────────────────────────────┐
│         UI Layer (HTML + Leaflet)       │
├─────────────────────────────────────────┤
│         Application Layer               │
│  ┌──────────┬──────────┬──────────────┐ │
│  │ GeoFence │  Rules   │   Tracking   │ │
│  │ Service  │  Engine  │   Service    │ │
│  └──────────┴──────────┴──────────────┘ │
│  ┌──────────────────────────────────┐  │
│  │      Analytics Service           │  │
│  └──────────────────────────────────┘  │
├─────────────────────────────────────────┤
│         WebGeoDB (IndexedDB)            │
├─────────────────────────────────────────┤
│         Browser Storage                 │
└─────────────────────────────────────────┘
```

### Data Models

#### 1. Geo-fence (GeoFence)

```typescript
interface GeoFence {
  id: string;
  name: string;
  description?: string;
  type: 'store' | 'warehouse' | 'delivery-zone' | 'custom';
  geometry: Polygon;
  properties: Record<string, any>;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}
```

#### 2. Marketing Rule (MarketingRule)

```typescript
interface MarketingRule {
  id: string;
  name: string;
  fenceId: string;
  trigger: 'enter' | 'exit' | 'dwell';
  dwellTime?: number;
  action: MarketingAction;
  conditions: RuleCondition[];
  priority: number;
  active: boolean;
}
```

#### 3. Fence Event (FenceEvent)

```typescript
interface FenceEvent {
  id: string;
  fenceId: string;
  userId: string;
  eventType: 'enter' | 'exit' | 'dwell';
  timestamp: number;
  location: Point;
  triggeredRules: string[];
  processed: boolean;
}
```

---

## Core Implementation

### 1. Database Initialization

```typescript
import { WebGeoDB } from '@webgeodb/core';

export class GeoFencingApp {
  private db: WebGeoDB;

  constructor(private config: GeoFencingConfig) {
    this.db = new WebGeoDB({
      name: config.dbName,
      version: config.dbVersion
    });
  }

  async init(): Promise<void> {
    await this.db.open();

    // Define schema
    this.db.schema({
      fences: {
        id: 'string',
        name: 'string',
        type: 'string',
        geometry: 'geometry',
        active: 'boolean',
        createdAt: 'number',
        updatedAt: 'number'
      },
      rules: {
        id: 'string',
        name: 'string',
        fenceId: 'string',
        trigger: 'string',
        action: 'json',
        conditions: 'json',
        priority: 'number',
        active: 'boolean'
      },
      // ... other tables
    });

    // Create indexes
    this.db.fences.createIndex('geometry', { auto: true });
    this.db.rules.createIndex('fenceId');
  }
}
```

### 2. Geo-fence Service

```typescript
export class GeoFenceService {
  constructor(private db: WebGeoDB) {}

  async createFence(request: CreateFenceRequest): Promise<GeoFence> {
    const fence: GeoFence = {
      id: crypto.randomUUID(),
      name: request.name,
      type: request.type,
      geometry: request.geometry,
      properties: request.properties || {},
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.db.fences.insert(fence);
    return fence;
  }

  async findFencesContainingPoint(
    point: Point
  ): Promise<GeoFence[]> {
    const fences = await this.db.fences
      .where('active', '=', true)
      .toArray();

    const insideFences: GeoFence[] = [];

    for (const fence of fences) {
      if (await this.checkPolygonContainsPoint(fence.geometry, point)) {
        insideFences.push(fence);
      }
    }

    return insideFences;
  }

  private async checkPolygonContainsPoint(
    polygon: Polygon,
    point: Point
  ): Promise<boolean> {
    const [lng, lat] = point.coordinates;
    const [coordinates] = polygon.coordinates;

    let inside = false;

    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      const [xi, yi] = coordinates[i];
      const [xj, yj] = coordinates[j];

      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }
}
```

### 3. Location Tracking Service

```typescript
export class LocationTrackingService {
  private userStates: Map<string, Map<string, UserFenceState>> = new Map();

  async handleLocationUpdate(
    request: LocationCheckRequest
  ): Promise<LocationCheckResponse> {
    // Save location record
    await this.db.userLocations.insert({
      id: crypto.randomUUID(),
      userId: request.userId,
      timestamp: request.timestamp,
      geometry: request.location
    });

    // Check all fences
    const fences = await this.db.fences
      .where('active', '=', true)
      .toArray();

    const insideFences: Array<{
      fenceId: string;
      fenceName: string;
      entered: boolean;
      dwellTime?: number;
    }> = [];

    for (const fence of fences) {
      const inside = await this.isPointInPolygon(
        request.location,
        fence.geometry
      );

      if (inside) {
        const fenceState = this.getUserState(request.userId).get(fence.id);
        const dwellTime = fenceState?.enterTime
          ? request.timestamp - fenceState.enterTime
          : 0;

        insideFences.push({
          fenceId: fence.id,
          fenceName: fence.name,
          entered: true,
          dwellTime
        });

        // Detect enter event
        if (!fenceState?.inside) {
          await this.createEnterEvent(
            fence.id,
            request.userId,
            request.location,
            request.timestamp
          );
        }

        // Update state
        this.getUserState(request.userId).set(fence.id, {
          fenceId: fence.id,
          inside: true,
          enterTime: fenceState?.enterTime || request.timestamp,
          lastCheckTime: request.timestamp
        });
      }
    }

    return { insideFences, triggeredActions: [] };
  }
}
```

### 4. Marketing Rule Engine

```typescript
export class MarketingRuleEngine {
  async evaluateEvent(event: FenceEvent): Promise<MarketingAction[]> {
    const triggeredActions: MarketingAction[] = [];

    // Get active rules for this fence
    const rules = await this.getFenceRules(event.fenceId);

    // Filter rules matching event type
    const matchingRules = rules.filter(
      rule => rule.trigger === event.eventType
    );

    // Evaluate each rule
    for (const rule of matchingRules) {
      if (await this.checkConditions(rule, event)) {
        triggeredActions.push(rule.action);

        // Record triggered rule
        await this.db.fenceEvents.update(event.id, {
          triggeredRules: [...event.triggeredRules, rule.id]
        });
      }
    }

    return triggeredActions;
  }

  private async checkConditions(
    rule: MarketingRule,
    event: FenceEvent
  ): Promise<boolean> {
    if (!rule.conditions || rule.conditions.length === 0) {
      return true;
    }

    // All conditions must be satisfied
    for (const condition of rule.conditions) {
      const passes = await this.checkCondition(condition, event);
      if (!passes) {
        return false;
      }
    }

    return true;
  }
}
```

### 5. Heatmap Generation

```typescript
export class AnalyticsService {
  async generateHeatmap(
    bbox: [number, number, number, number],
    cellSize: number = 0.01
  ): Promise<HeatmapPoint[]> {
    // Generate grid
    const cells = this.createGrid(bbox, cellSize);

    // Get user location data
    const locations = await this.db.userLocations.toArray();

    // Count for each cell
    for (const cell of cells) {
      cell.count = locations.filter(loc =>
        this.isPointInCell(loc.geometry.coordinates, cell)
      ).length;
    }

    // Calculate intensity
    const maxCount = Math.max(...cells.map(c => c.count), 1);

    return cells
      .filter(cell => cell.count > 0)
      .map(cell => ({
        lat: cell.center[1],
        lng: cell.center[0],
        count: cell.count,
        intensity: cell.count / maxCount
      }));
  }

  private createGrid(bbox: [number, number, number, number], cellSize: number) {
    const [minX, minY, maxX, maxY] = bbox;
    const cells = [];

    for (let x = minX; x < maxX; x += cellSize) {
      for (let y = minY; y < maxY; y += cellSize) {
        cells.push({
          bounds: [x, y, Math.min(x + cellSize, maxX), Math.min(y + cellSize, maxY)],
          center: [(x + x + cellSize) / 2, (y + y + cellSize) / 2],
          count: 0
        });
      }
    }

    return cells;
  }
}
```

### 6. Leaflet Map Integration

```typescript
import L from 'leaflet';

export class GeoFenceMap {
  private map: L.Map;
  private fenceLayer: L.GeoJSON;

  constructor(options: MapOptions) {
    this.map = L.map(options.container).setView(
      options.center || [39.9042, 116.4074],
      options.zoom || 13
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    this.fenceLayer = L.geoJSON(undefined, {
      style: this.getFenceStyle.bind(this),
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`
          <h3>${feature.properties.name}</h3>
          <p>${feature.properties.description}</p>
        `);
      }
    }).addTo(this.map);
  }

  displayFences(fences: GeoFence[]): void {
    const features = fences.map(fence => ({
      type: 'Feature',
      id: fence.id,
      geometry: fence.geometry,
      properties: fence
    }));

    this.fenceLayer.clearLayers();
    this.fenceLayer.addData({ type: 'FeatureCollection', features });
  }

  displayHeatmap(heatmapData: HeatmapPoint[]): void {
    const heatData = heatmapData.map(p => [p.lat, p.lng, p.intensity]);

    L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17
    }).addTo(this.map);
  }
}
```

---

## Complete Example

### Demo Code

```typescript
import { GeoFencingApp, DEFAULT_CONFIG } from './app';

class Demo {
  async run(): Promise<void> {
    // 1. Initialize app
    const app = new GeoFencingApp(DEFAULT_CONFIG);
    await app.init();

    // 2. Create geo-fence
    const fence = await app.fences.createFence({
      name: 'Joy City Chaoyang',
      type: 'store',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [116.4830, 39.9210],
          [116.4870, 39.9210],
          [116.4870, 39.9250],
          [116.4830, 39.9250],
          [116.4830, 39.9210]
        ]]
      }
    });

    // 3. Create rule
    const rule = await app.rules.createRule({
      name: 'Enter Store Coupon',
      fenceId: fence.id,
      trigger: 'enter',
      action: {
        type: 'push-notification',
        content: {
          title: 'Welcome!',
          message: 'You have a 20% off coupon',
          discountCode: 'MALL80OFF'
        },
        channel: 'mobile'
      },
      conditions: []
    });

    // 4. Simulate location update
    const result = await app.tracking.handleLocationUpdate({
      userId: 'user-001',
      location: {
        type: 'Point',
        coordinates: [116.4850, 39.9230]
      },
      timestamp: Date.now()
    });

    console.log('Inside fences:', result.insideFences);
    console.log('Triggered actions:', result.triggeredActions);

    // 5. Generate heatmap
    const heatmapData = await app.analytics.generateHeatmap(
      [116.38, 39.90, 116.49, 39.93],
      0.005
    );

    console.log('Heatmap data points:', heatmapData.length);
  }
}

// Run demo
new Demo().run();
```

---

## Deployment and Usage

### Local Development

```bash
# Clone project
cd /Users/zhangyuting/github/zhyt1985/webgeodb/examples/projects/geo-fencing

# Install dependencies
npm install

# Start dev server
npm run dev
```

Visit http://localhost:3000 to see the demo page.

### Build for Production

```bash
npm run build
```

Build artifacts are in the `dist` directory.

### Testing

```bash
# Run tests
npm test

# View coverage
npm run coverage
```

---

## Extension Features

### 1. Add New Rule Condition Types

```typescript
// Extend in MarketingRuleEngine
private async checkCondition(
  condition: RuleCondition,
  event: FenceEvent
): Promise<boolean> {
  switch (condition.type) {
    case 'weather':
      return await this.checkWeatherCondition(condition);
    // ... other types
  }
}
```

### 2. Integrate Third-party Map Services

```typescript
// Use Mapbox GL
import mapboxgl from 'mapbox-gl';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [116.4074, 39.9042],
  zoom: 13
});
```

### 3. Add Data Export Functionality

```typescript
async exportData(format: 'json' | 'csv' | 'geojson') {
  const data = await this.app.exportData();

  if (format === 'geojson') {
    return JSON.stringify(
      await this.app.fences.exportFencesAsGeoJSON(),
      null,
      2
    );
  }

  // ... other formats
}
```

---

## Best Practices

### 1. Performance Optimization

- Use spatial indexes to accelerate queries
- Batch operations to reduce database I/O
- Regularly clean expired location data
- Implement data pagination and limits

### 2. Data Security

- Validate user-inputted geometry data
- Encrypt sensitive user location information
- Implement access control and permission management

### 3. User Experience

- Provide intuitive map drawing tools
- Real-time feedback on geo-fence status
- Optimize mobile performance

---

## FAQ

### Q: How to handle location data for many users?

**A:** Use the following strategies:

1. Regularly clean expired data (e.g., location records from 7+ days ago)
2. Implement data pagination and limits
3. Use spatial indexes to accelerate queries
4. Consider using Web Workers for background processing

### Q: How to improve geo-fence detection accuracy?

**A:** You can:

1. Use high-precision GPS positioning
2. Implement location smoothing algorithms to reduce GPS drift
3. Set reasonable accuracy thresholds
4. Consider using polygon buffer zones

### Q: How to scale to multiple cities?

**A:** Recommended:

1. Create separate database instances for each city
2. Implement data center switching functionality
3. Use partitioned storage for better query performance
4. Consider using CDN to accelerate map tile loading

---

## Summary

The E-commerce Geo-fencing Marketing System demonstrates the powerful application of WebGeoDB in real-world business scenarios. Through this example, you learned:

- ✅ Design complete location-based marketing system architecture
- ✅ Implement geo-fence management and spatial queries
- ✅ Build flexible marketing rule engines
- ✅ Integrate map visualization and heatmaps
- ✅ Conduct data analysis and performance evaluation

### Next Steps

- **[Smart City Infrastructure Management](./smart-city.md)** - City facility management
- **[Environmental Monitoring Platform](./environmental-monitoring.md)** - Sensor data collection
- **[Logistics Delivery Optimization](./logistics.md)** - Route planning and optimization

---

## Resources

- **[Full Code](https://github.com/zhyt1985/webgeodb/tree/main/examples/projects/geo-fencing)** - Project source code
- **[Live Demo](https://webgeodb.dev/demo/geo-fencing)** - Interactive demo
- **[Leaflet Documentation](https://leafletjs.com/)** - Leaflet official docs
- **[GeoJSON Specification](https://geojson.org/)** - GeoJSON format specification
