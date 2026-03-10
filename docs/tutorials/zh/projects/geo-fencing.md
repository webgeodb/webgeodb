# 电商地理围栏营销系统

> **难度**: 中级 | **预计时间**: 60-90分钟 | **技术栈**: TypeScript, WebGeoDB, Leaflet

## 项目概述

电商地理围栏营销系统是一个完整的端到端应用示例，展示了如何使用 WebGeoDB 构建生产级的地理位置营销平台。该系统涵盖了地理围栏管理、实时位置追踪、营销规则引擎、热力图分析等核心功能。

### 应用场景

- 🛒 **零售营销**: 用户进入商场围栏时自动推送优惠券
- 🚚 **配送服务**: 检测用户是否在配送范围内，动态计算配送费
- 📊 **用户行为分析**: 分析用户在不同围栏内的停留时间和访问频次
- 🔥 **热力图可视化**: 基于位置数据生成用户分布热力图

### 核心功能

1. **地理围栏管理**: 创建、编辑、删除多边形围栏
2. **实时位置检测**: 判断用户是否在围栏内，计算停留时间
3. **营销规则引擎**: 配置进入/离开/停留触发规则
4. **数据分析和可视化**: 生成统计报表和热力图
5. **地图可视化**: 基于 Leaflet 的交互式地图界面

---

## 学习目标

通过本章学习，你将能够：

1. 设计和实现完整的地理位置营销系统架构
2. 使用 WebGeoDB 进行空间数据存储和查询
3. 实现实时位置追踪和事件检测
4. 构建灵活的营销规则引擎
5. 集成 Leaflet 地图进行可视化
6. 生成热力图和统计报表

---

## 系统架构

### 架构设计

系统采用分层架构设计：

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

### 数据模型

#### 1. 地理围栏 (GeoFence)

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

#### 2. 营销规则 (MarketingRule)

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

#### 3. 围栏事件 (FenceEvent)

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

## 核心实现

### 1. 数据库初始化

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

    // 定义表结构
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
      // ... 其他表
    });

    // 创建索引
    this.db.fences.createIndex('geometry', { auto: true });
    this.db.rules.createIndex('fenceId');
  }
}
```

### 2. 地理围栏服务

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

### 3. 位置追踪服务

```typescript
export class LocationTrackingService {
  private userStates: Map<string, Map<string, UserFenceState>> = new Map();

  async handleLocationUpdate(
    request: LocationCheckRequest
  ): Promise<LocationCheckResponse> {
    // 保存位置记录
    await this.db.userLocations.insert({
      id: crypto.randomUUID(),
      userId: request.userId,
      timestamp: request.timestamp,
      geometry: request.location
    });

    // 检查所有围栏
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

        // 检测进入事件
        if (!fenceState?.inside) {
          await this.createEnterEvent(
            fence.id,
            request.userId,
            request.location,
            request.timestamp
          );
        }

        // 更新状态
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

### 4. 营销规则引擎

```typescript
export class MarketingRuleEngine {
  async evaluateEvent(event: FenceEvent): Promise<MarketingAction[]> {
    const triggeredActions: MarketingAction[] = [];

    // 获取该围栏的激活规则
    const rules = await this.getFenceRules(event.fenceId);

    // 过滤出匹配事件类型的规则
    const matchingRules = rules.filter(
      rule => rule.trigger === event.eventType
    );

    // 评估每个规则
    for (const rule of matchingRules) {
      if (await this.checkConditions(rule, event)) {
        triggeredActions.push(rule.action);

        // 记录触发的规则
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

    // 所有条件都必须满足
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

### 5. 热力图生成

```typescript
export class AnalyticsService {
  async generateHeatmap(
    bbox: [number, number, number, number],
    cellSize: number = 0.01
  ): Promise<HeatmapPoint[]> {
    // 生成网格
    const cells = this.createGrid(bbox, cellSize);

    // 获取用户位置数据
    const locations = await this.db.userLocations.toArray();

    // 为每个网格计数
    for (const cell of cells) {
      cell.count = locations.filter(loc =>
        this.isPointInCell(loc.geometry.coordinates, cell)
      ).length;
    }

    // 计算强度
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

### 6. Leaflet 地图集成

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

## 完整示例

### 演示代码

```typescript
import { GeoFencingApp, DEFAULT_CONFIG } from './app';

class Demo {
  async run(): Promise<void> {
    // 1. 初始化应用
    const app = new GeoFencingApp(DEFAULT_CONFIG);
    await app.init();

    // 2. 创建围栏
    const fence = await app.fences.createFence({
      name: '朝阳大悦城',
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

    // 3. 创建规则
    const rule = await app.rules.createRule({
      name: '进店优惠券',
      fenceId: fence.id,
      trigger: 'enter',
      action: {
        type: 'push-notification',
        content: {
          title: '欢迎光临！',
          message: '您有一张8折优惠券',
          discountCode: 'MALL80OFF'
        },
        channel: 'mobile'
      },
      conditions: []
    });

    // 4. 模拟位置更新
    const result = await app.tracking.handleLocationUpdate({
      userId: 'user-001',
      location: {
        type: 'Point',
        coordinates: [116.4850, 39.9230]
      },
      timestamp: Date.now()
    });

    console.log('在围栏内:', result.insideFences);
    console.log('触发动作:', result.triggeredActions);

    // 5. 生成热力图
    const heatmapData = await app.analytics.generateHeatmap(
      [116.38, 39.90, 116.49, 39.93],
      0.005
    );

    console.log('热力图数据点:', heatmapData.length);
  }
}

// 运行演示
new Demo().run();
```

---

## 部署和使用

### 本地开发

```bash
# 克隆项目
cd /Users/zhangyuting/github/zhyt1985/webgeodb/examples/projects/geo-fencing

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看演示页面。

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist` 目录中。

### 测试

```bash
# 运行测试
npm test

# 查看覆盖率
npm run coverage
```

---

## 扩展功能

### 1. 添加新的规则条件类型

```typescript
// 在 MarketingRuleEngine 中扩展
private async checkCondition(
  condition: RuleCondition,
  event: FenceEvent
): Promise<boolean> {
  switch (condition.type) {
    case 'weather':
      return await this.checkWeatherCondition(condition);
    // ... 其他类型
  }
}
```

### 2. 集成第三方地图服务

```typescript
// 使用 Mapbox GL
import mapboxgl from 'mapbox-gl';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [116.4074, 39.9042],
  zoom: 13
});
```

### 3. 添加数据导出功能

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

  // ... 其他格式
}
```

---

## 最佳实践

### 1. 性能优化

- 使用空间索引加速查询
- 批量操作减少数据库IO
- 定期清理过期位置数据
- 实现数据分页和限制

### 2. 数据安全

- 验证用户输入的几何数据
- 加密敏感的用户位置信息
- 实现访问控制和权限管理

### 3. 用户体验

- 提供直观的地图绘制工具
- 实时反馈围栏状态
- 优化移动端性能

---

## 常见问题

### Q: 如何处理大量用户的位置数据？

**A:** 使用以下策略：

1. 定期清理过期数据（如7天前的位置记录）
2. 实现数据分页和限制
3. 使用空间索引加速查询
4. 考虑使用 Web Worker 进行后台处理

### Q: 如何提高围栏检测的准确性？

**A:** 可以通过以下方式：

1. 使用高精度的GPS定位
2. 实现位置平滑算法减少GPS漂移
3. 设置合理的精度阈值
4. 考虑使用多边形缓冲区

### Q: 如何扩展到多个城市？

**A:** 建议：

1. 为每个城市创建独立的数据库实例
2. 实现数据中心切换功能
3. 使用分区存储提高查询性能
4. 考虑使用 CDN 加速地图瓦片加载

---

## 总结

电商地理围栏营销系统展示了 WebGeoDB 在实际业务中的强大应用。通过本示例，你学会了：

- ✅ 设计完整的地理位置营销系统架构
- ✅ 实现地理围栏管理和空间查询
- ✅ 构建灵活的营销规则引擎
- ✅ 集成地图可视化和热力图
- ✅ 进行数据分析和效果评估

### 下一步学习

- **[智慧城市基础设施管理](./smart-city.md)** - 城市设施管理
- **[环境监测数据平台](./environmental-monitoring.md)** - 传感器数据采集
- **[物流配送优化系统](./logistics.md)** - 路径规划和优化

---

## 参考资源

- **[完整代码](https://github.com/zhyt1985/webgeodb/tree/main/examples/projects/geo-fencing)** - 项目源码
- **[在线演示](https://webgeodb.dev/demo/geo-fencing)** - 交互式演示
- **[Leaflet文档](https://leafletjs.com/)** - Leaflet官方文档
- **[GeoJSON规范](https://geojson.org/)** - GeoJSON格式规范
