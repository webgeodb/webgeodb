# 第4章: 实际应用场景

> **学习时间**: 90-120分钟 | **先决条件**: 第1-3章

## 学习目标

通过本章学习，你将能够：
- 设计和实现完整的WebGeoDB应用架构
- 集成主流地图库（Leaflet、Mapbox GL）
- 实现实时位置追踪和轨迹回放
- 构建离线优先的地图应用
- 实现数据可视化（热力图、聚类、聚合）

---

## 核心概念

### 4.1 应用架构设计

构建生产级的地理信息应用需要清晰的架构分层。我们推荐使用**Repository模式**配合**Service层**来实现关注点分离。

#### 架构分层

```
┌─────────────────────────────────────┐
│      UI Layer (React/Vue/Svelte)    │  ← 用户界面
├─────────────────────────────────────┤
│      Service Layer (业务逻辑)        │  ← 应用逻辑
├─────────────────────────────────────┤
│      Repository Layer (数据访问)     │  ← 数据访问
├─────────────────────────────────────┤
│      WebGeoDB (数据持久化)           │  ← 数据存储
└─────────────────────────────────────┘
```

#### 关键要点

- **UI层**: 负责用户交互和状态展示
- **Service层**: 封装业务逻辑，协调多个Repository
- **Repository层**: 提供统一的数据访问接口
- **WebGeoDB**: 处理数据持久化和空间查询

**示例代码:**
```typescript
// types.ts - 类型定义
export interface Location {
  id: string;
  userId: string;
  timestamp: number;
  geometry: Point;
  accuracy: number;
  speed?: number;
  heading?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isSharing: boolean;
}

// repository.ts - 数据访问层
export class LocationRepository {
  constructor(private db: WebGeoDB) {}

  async saveLocation(location: Location): Promise<void> {
    await this.db.locations.insert(location);
  }

  async getUserLocations(
    userId: string,
    startTime: number,
    endTime: number
  ): Promise<Location[]> {
    return await this.db.locations
      .where('userId', '=', userId)
      .where('timestamp', '>=', startTime)
      .where('timestamp', '<=', endTime)
      .orderBy('timestamp', 'asc')
      .toArray();
  }

  async findNearbyUsers(
    center: [number, number],
    radius: number
  ): Promise<Location[]> {
    return await this.db.locations
      .distance('geometry', center, '<', radius)
      .toArray();
  }
}

// service.ts - 业务逻辑层
export class LocationService {
  private locationRepo: LocationRepository;
  private userRepo: UserRepository;

  constructor(db: WebGeoDB) {
    this.locationRepo = new LocationRepository(db);
    this.userRepo = new UserRepository(db);
  }

  async startSharing(userId: string): Promise<void> {
    await this.userRepo.updateSharingStatus(userId, true);
  }

  async updateLocation(location: Location): Promise<void> {
    await this.locationRepo.saveLocation(location);
  }

  async getNearbyFriends(
    userId: string,
    center: [number, number],
    radius: number
  ): Promise<Array<{ user: User; location: Location }>> {
    const nearby = await this.locationRepo.findNearbyUsers(center, radius);
    const friends = await this.userRepo.getFriends(userId);

    return nearby
      .filter(loc => friends.includes(loc.userId))
      .map(loc => ({
        location: loc,
        user: friends.find(f => f.id === loc.userId)!
      }));
  }
}

// app.ts - 应用入口
class LocationSharingApp {
  private db: WebGeoDB;
  private locationService: LocationService;

  async init() {
    this.db = new WebGeoDB({
      name: 'location-sharing',
      version: 1
    });

    await this.db.open();

    this.db.schema({
      users: {
        id: 'string',
        name: 'string',
        email: 'string',
        isSharing: 'boolean'
      },
      locations: {
        id: 'string',
        userId: 'string',
        timestamp: 'number',
        geometry: 'geometry',
        accuracy: 'number',
        speed: 'number',
        heading: 'number'
      }
    });

    this.locationService = new LocationService(this.db);
  }

  getService() {
    return this.locationService;
  }
}
```

> **💡 提示:** 使用Repository模式可以轻松切换单元测试中的数据源，提高代码可测试性。

---

### 4.2 地图可视化集成

WebGeoDB与主流地图库无缝集成，支持动态数据绑定和实时更新。

#### Leaflet集成

**关键要点**

- 使用GeoJSON格式直接传递数据
- 利用LayerGroup管理大量数据
- 实现自定义数据源（Real-time DataSource）

**示例代码:**
```typescript
import L from 'leaflet';
import { WebGeoDB } from '@webgeodb/core';

class LeafletMapIntegration {
  private map: L.Map;
  private db: WebGeoDB;
  private featureLayer: L.GeoJSON;

  async init(mapId: string) {
    // 初始化地图
    this.map = L.map(mapId).setView([39.9042, 116.4074], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // 初始化数据库
    this.db = new WebGeoDB({ name: 'map-data' });
    await this.db.open();

    // 创建图层
    this.featureLayer = L.geoJSON(undefined, {
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`
          <h3>${feature.properties.name}</h3>
          <p>${feature.properties.description}</p>
        `);
      }
    }).addTo(this.map);

    // 加载数据
    await this.loadData();
  }

  async loadData() {
    const features = await this.db.features.toArray();
    const geojson = {
      type: 'FeatureCollection' as const,
      features: features
    };

    this.featureLayer.addData(geojson);
  }

  async addFeature(feature: Feature) {
    // 保存到数据库
    await this.db.features.insert(feature);

    // 更新地图
    this.featureLayer.addData(feature);
  }

  async searchNearby(center: [number, number], radius: number) {
    const nearby = await this.db.features
      .distance('geometry', center, '<', radius)
      .toArray();

    // 清除现有标记
    this.featureLayer.clearLayers();

    // 显示附近要素
    this.featureLayer.addData({
      type: 'FeatureCollection',
      features: nearby
    });

    // 调整视图
    if (nearby.length > 0) {
      const bounds = L.latLngBounds(
        nearby.map(f => [
          f.geometry.coordinates[1],
          f.geometry.coordinates[0]
        ])
      );
      this.map.fitBounds(bounds);
    }
  }
}

// 使用
const mapApp = new LeafletMapIntegration();
await mapApp.init('map');
```

#### Mapbox GL集成

**关键要点**

- 使用Source和Layer分离数据和样式
- 实现数据驱动样式（Data-driven Styles）
- 利用Cluster进行大数据可视化

**示例代码:**
```typescript
import mapboxgl from 'mapbox-gl';
import { WebGeoDB } from '@webgeodb/core';

class MapboxIntegration {
  private map: mapboxgl.Map;
  private db: WebGeoDB;

  async init(mapId: string) {
    mapboxgl.accessToken = 'YOUR_ACCESS_TOKEN';

    this.map = new mapboxgl.Map({
      container: mapId,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [116.4074, 39.9042],
      zoom: 13
    });

    this.db = new WebGeoDB({ name: 'map-data' });
    await this.db.open();

    this.map.on('load', () => this.setupLayers());
  }

  private async setupLayers() {
    // 加载数据
    const features = await this.db.features.toArray();

    // 添加数据源
    this.map.addSource('features', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: features
      }
    });

    // 添加聚类数据源
    this.map.addSource('features-clustered', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: features
      },
      cluster: true,
      clusterRadius: 50
    });

    // 添加聚类圆圈
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'features-clustered',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',
          100,
          '#f1f075',
          750,
          '#f28cb1'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          100,
          30,
          750,
          40
        ]
      }
    });

    // 添加未聚类点
    this.map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'features-clustered',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': 6,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    // 添加类别标签
    this.map.addLayer({
      id: 'category-label',
      type: 'symbol',
      source: 'features',
      layout: {
        'text-field': ['get', 'category'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 1.25],
        'text-anchor': 'top'
      },
      paint: {
        'text-color': '#333'
      }
    });
  }

  async filterByCategory(category: string) {
    const features = await this.db.features
      .where('properties.category', '=', category)
      .toArray();

    const source = this.map.getSource('features') as mapboxgl.GeoJSONSource;
    source.setData({
      type: 'FeatureCollection',
      features: features
    });
  }

  async updateFeature(id: string, updates: any) {
    await this.db.features.update(id, updates);

    // 重新加载所有数据
    const features = await this.db.features.toArray();
    const source = this.map.getSource('features') as mapboxgl.GeoJSONSource;
    source.setData({
      type: 'FeatureCollection',
      features: features
    });
  }
}
```

---

### 4.3 实时位置追踪

结合Geolocation API和WebGeoDB，构建实时位置追踪系统。

#### 核心组件

**关键要点**

- 使用Geolocation API获取位置
- 实现轨迹录制和回放
- 计算距离、速度、航向
- 处理位置误差和GPS漂移

**示例代码:**
```typescript
interface Track {
  id: string;
  name: string;
  userId: string;
  startTime: number;
  endTime?: number;
  distance: number;
}

class LocationTracker {
  private db: WebGeoDB;
  private watchId: number | null = null;
  private currentTrack: Track | null = null;
  private locations: Location[] = [];

  async init() {
    this.db = new WebGeoDB({
      name: 'location-tracker',
      version: 1
    });

    await this.db.open();

    this.db.schema({
      tracks: {
        id: 'string',
        name: 'string',
        userId: 'string',
        startTime: 'number',
        endTime: 'number',
        distance: 'number'
      },
      locations: {
        id: 'string',
        trackId: 'string',
        timestamp: 'number',
        geometry: 'geometry',
        accuracy: 'number',
        speed: 'number',
        heading: 'number'
      }
    });

    // 创建空间索引
    this.db.locations.createIndex('geometry');
  }

  async startTracking(trackName: string): Promise<string> {
    const track: Track = {
      id: crypto.randomUUID(),
      name: trackName,
      userId: 'user-1',
      startTime: Date.now(),
      distance: 0
    };

    await this.db.tracks.insert(track);
    this.currentTrack = track;
    this.locations = [];

    // 开始监听位置变化
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );

    return track.id;
  }

  private async handlePositionUpdate(position: GeolocationPosition) {
    if (!this.currentTrack) return;

    const location: Location = {
      id: crypto.randomUUID(),
      trackId: this.currentTrack.id,
      timestamp: position.timestamp,
      geometry: {
        type: 'Point',
        coordinates: [
          position.coords.longitude,
          position.coords.latitude
        ]
      },
      accuracy: position.coords.accuracy,
      speed: position.coords_speed || undefined,
      heading: position.coords.heading || undefined
    };

    // 保存位置
    await this.db.locations.insert(location);
    this.locations.push(location);

    // 计算距离
    if (this.locations.length > 1) {
      const prevLocation = this.locations[this.locations.length - 2];
      const distance = this.calculateDistance(
        prevLocation.geometry.coordinates,
        location.geometry.coordinates
      );

      this.currentTrack.distance += distance;

      // 更新轨迹距离
      await this.db.tracks.update(this.currentTrack.id, {
        distance: this.currentTrack.distance
      });
    }

    // 触发事件
    this.dispatchEvent('locationupdate', { location, track: this.currentTrack });
  }

  private calculateDistance(
    from: [number, number],
    to: [number, number]
  ): number {
    const R = 6371e3; // 地球半径（米）
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

  async stopTracking(): Promise<void> {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.currentTrack) {
      await this.db.tracks.update(this.currentTrack.id, {
        endTime: Date.now()
      });
      this.currentTrack = null;
    }

    this.locations = [];
  }

  async getTrack(trackId: string): Promise<{
    track: Track;
    locations: Location[];
    geometry: LineString;
  }> {
    const track = await this.db.tracks.get(trackId);
    const locations = await this.db.locations
      .where('trackId', '=', trackId)
      .orderBy('timestamp', 'asc')
      .toArray();

    // 构建轨迹几何
    const geometry: LineString = {
      type: 'LineString',
      coordinates: locations.map(loc => loc.geometry.coordinates)
    };

    return { track, locations, geometry };
  }

  async replayTrack(
    trackId: string,
    speed: number = 1,
    onUpdate: (location: Location, progress: number) => void
  ): Promise<void> {
    const { locations } = await this.getTrack(trackId);

    for (let i = 0; i < locations.length; i++) {
      const current = locations[i];
      const progress = (i + 1) / locations.length;

      onUpdate(current, progress);

      // 等待（根据速度调整）
      if (i < locations.length - 1) {
        const next = locations[i + 1];
        const delay = (next.timestamp - current.timestamp) / speed;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private handlePositionError(error: GeolocationPositionError) {
    console.error('Position error:', error);
    this.dispatchEvent('locationerror', { error });
  }

  private dispatchEvent(type: string, detail: any) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

// 使用
const tracker = new LocationTracker();
await tracker.init();

// 开始追踪
const trackId = await tracker.startTracking('Morning Run');

// 监听位置更新
window.addEventListener('locationupdate', (event: any) => {
  const { location, track } = event.detail;
  console.log(`Distance: ${track.distance.toFixed(0)}m`);
});

// 停止追踪
// await tracker.stopTracking();

// 回放轨迹
// await tracker.replayTrack(trackId, 10, (location, progress) => {
//   console.log(`Progress: ${(progress * 100).toFixed(0)}%`);
//   console.log(`Location: ${location.geometry.coordinates}`);
// });
```

---

### 4.4 离线支持

构建离线优先的地图应用，提供无缝的在线/离线体验。

#### Service Worker配置

**关键要点**

- 缓存地图瓦片和静态资源
- 实现后台同步（Background Sync）
- 处理离线编辑冲突
- 优化存储空间使用

**示例代码:**
```typescript
// sw.ts - Service Worker
const CACHE_NAME = 'map-app-v1';
const OFFLINE_DATA = 'offline-data';

// 需要缓存的资源
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/vendor/leaflet.js',
  '/vendor/leaflet.css'
];

// 安装事件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
});

// 激活事件
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 处理地图瓦片请求
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(handleTileRequest(request));
    return;
  }

  // 处理API请求
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 处理静态资源
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});

// 处理地图瓦片
async function handleTileRequest(request: Request): Promise<Response> {
  try {
    // 尝试从网络获取
    const networkResponse = await fetch(request);

    // 缓存瓦片
    const cache = await caches.open(OFFLINE_DATA);
    cache.put(request, networkResponse.clone());

    return networkResponse;
  } catch {
    // 离线时从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // 返回空白瓦片
    return new Response('offline', { status: 404 });
  }
}

// 处理API请求
async function handleApiRequest(request: Request): Promise<Response> {
  try {
    // 在线时转发到服务器
    return await fetch(request);
  } catch {
    // 离线时返回本地数据
    return new Response(
      JSON.stringify({ error: 'offline', message: 'No network connection' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-changes') {
    event.waitUntil(syncOfflineChanges());
  }
});

async function syncOfflineChanges() {
  // 同步离线时做的修改
  const offlineChanges = await getOfflineChanges();

  for (const change of offlineChanges) {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify(change)
      });

      await markChangeSynced(change.id);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

#### 离线数据管理

**示例代码:**
```typescript
class OfflineDataManager {
  private db: WebGeoDB;
  private syncQueue: Array<{ type: string; data: any }> = [];

  async init() {
    this.db = new WebGeoDB({
      name: 'offline-map',
      version: 1
    });

    await this.db.open();

    this.db.schema({
      areas: {
        id: 'string',
        name: 'string',
        bbox: 'json',
        downloadedAt: 'number'
      },
      offlineChanges: {
        id: 'string',
        type: 'string',
        data: 'json',
        synced: 'boolean',
        createdAt: 'number'
      }
    });

    // 监听在线状态
    window.addEventListener('online', () => this.syncChanges());
  }

  async downloadArea(
    name: string,
    bbox: [number, number, number, number]
  ): Promise<void> {
    // 计算区域范围
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[1]],
          [bbox[2], bbox[3]],
          [bbox[0], bbox[3]],
          [bbox[0], bbox[1]]
        ]
      ]
    };

    // 从服务器下载该区域的数据
    const response = await fetch(`/api/features?bbox=${bbox.join(',')}`);
    const features = await response.json();

    // 批量插入到数据库
    await this.db.features.bulkPut(features);

    // 记录下载的区域
    await this.db.areas.insert({
      id: crypto.randomUUID(),
      name,
      bbox,
      downloadedAt: Date.now()
    });

    console.log(`Downloaded ${features.length} features for ${name}`);
  }

  async getOfflineFeatures(bbox: [number, number, number, number]) {
    // 查询离线数据
    return await this.db.features
      .intersects('geometry', {
        type: 'Polygon',
        coordinates: [
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[1]],
            [bbox[2], bbox[3]],
            [bbox[0], bbox[3]],
            [bbox[0], bbox[1]]
          ]
        ]
      })
      .toArray();
  }

  async queueOfflineChange(type: string, data: any): Promise<void> {
    const change = {
      id: crypto.randomUUID(),
      type,
      data,
      synced: false,
      createdAt: Date.now()
    };

    await this.db.offlineChanges.insert(change);
    this.syncQueue.push(change);
  }

  async syncChanges(): Promise<void> {
    if (!navigator.onLine) return;

    const unsynced = await this.db.offlineChanges
      .where('synced', '=', false)
      .toArray();

    for (const change of unsynced) {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change)
        });

        await this.db.offlineChanges.update(change.id, { synced: true });
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }

  async getStorageInfo(): Promise<{
    areas: number;
    features: number;
    pendingChanges: number;
  }> {
    const [areas, features, pendingChanges] = await Promise.all([
      this.db.areas.count(),
      this.db.features.count(),
      this.db.offlineChanges.where('synced', '=', false).count()
    ]);

    return { areas, features, pendingChanges };
  }
}
```

---

### 4.5 数据可视化

利用WebGeoDB的空间查询能力实现高级数据可视化。

#### 热力图（Heatmap）

**关键要点**

- 使用网格聚合数据
- 计算密度值
- 渲染梯度颜色

**示例代码:**
```typescript
class HeatmapGenerator {
  private db: WebGeoDB;

  constructor(db: WebGeoDB) {
    this.db = db;
  }

  async generateHeatmap(
    bbox: [number, number, number, number],
    cellSize: number = 0.01
  ): Promise<Array<{ lat: number; lng: number; count: number; intensity: number }>> {
    // 生成网格
    const cells = this.createGrid(bbox, cellSize);

    // 为每个网格计数
    for (const cell of cells) {
      const count = await this.db.features
        .intersects('geometry', cell.polygon)
        .count();

      cell.count = count;
    }

    // 计算强度
    const maxCount = Math.max(...cells.map(c => c.count));
    const heatmapData = cells.map(cell => ({
      lat: cell.center[1],
      lng: cell.center[0],
      count: cell.count,
      intensity: maxCount > 0 ? cell.count / maxCount : 0
    }));

    return heatmapData.filter(d => d.count > 0);
  }

  private createGrid(
    bbox: [number, number, number, number],
    cellSize: number
  ) {
    const [minX, minY, maxX, maxY] = bbox;
    const cells = [];

    for (let x = minX; x < maxX; x += cellSize) {
      for (let y = minY; y < maxY; y += cellSize) {
        const cellBbox: [number, number, number, number] = [
          x,
          y,
          x + cellSize,
          y + cellSize
        ];

        cells.push({
          polygon: this.bboxToPolygon(cellBbox),
          center: [(x + x + cellSize) / 2, (y + y + cellSize) / 2],
          count: 0
        });
      }
    }

    return cells;
  }

  private bboxToPolygon(bbox: [number, number, number, number]): Polygon {
    const [minX, minY, maxX, maxY] = bbox;
    return {
      type: 'Polygon',
      coordinates: [
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
          [minX, minY]
        ]
      ]
    };
  }
}

// 使用Leaflet渲染热力图
async function renderHeatmap(
  map: L.Map,
  db: WebGeoDB,
  bounds: L.LatLngBounds
) {
  const generator = new HeatmapGenerator(db);

  const bbox = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth()
  ] as [number, number, number, number];

  const heatmapData = await generator.generateHeatmap(bbox, 0.01);

  // 使用简单梯度
  const getColor = (intensity: number) => {
    if (intensity < 0.3) return 'blue';
    if (intensity < 0.6) return 'yellow';
    if (intensity < 0.8) return 'orange';
    return 'red';
  };

  // 添加热力图圆圈
  heatmapData.forEach(point => {
    L.circle([point.lat, point.lng], {
      radius: 500,
      color: getColor(point.intensity),
      fillColor: getColor(point.intensity),
      fillOpacity: 0.6
    }).addTo(map);
  });
}
```

#### 聚类分析（Clustering）

**示例代码:**
```typescript
class SpatialCluster {
  private db: WebGeoDB;

  constructor(db: WebGeoDB) {
    this.db = db;
  }

  async clusterByCategory(
    category: string,
    threshold: number = 0.001
  ): Promise<Array<{ center: [number, number]; count: number; points: Point[] }>> {
    const features = await this.db.features
      .where('properties.category', '=', category)
      .toArray();

    return this.performClustering(features, threshold);
  }

  private performClustering(
    features: Feature[],
    threshold: number
  ) {
    const clusters: Array<{
      center: [number, number];
      count: number;
      points: Point[];
    }> = [];

    for (const feature of features) {
      const point = feature.geometry as Point;
      let added = false;

      // 尝试添加到现有簇
      for (const cluster of clusters) {
        const distance = this.calculateDistance(cluster.center, point.coordinates);
        if (distance <= threshold) {
          cluster.points.push(point);
          cluster.count++;
          // 更新中心点
          cluster.center = this.calculateCenter(cluster.points);
          added = true;
          break;
        }
      }

      // 创建新簇
      if (!added) {
        clusters.push({
          center: point.coordinates,
          count: 1,
          points: [point]
        });
      }
    }

    return clusters;
  }

  private calculateDistance(
    from: [number, number],
    to: [number, number]
  ): number {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateCenter(points: Point[]): [number, number] {
    const sumLon = points.reduce((sum, p) => sum + p.coordinates[0], 0);
    const sumLat = points.reduce((sum, p) => sum + p.coordinates[1], 0);

    return [sumLon / points.length, sumLat / points.length];
  }
}
```

#### 数据聚合（Aggregation）

**示例代码:**
```typescript
class DataAggregator {
  private db: WebGeoDB;

  constructor(db: WebGeoDB) {
    this.db = db;
  }

  async aggregateByRegion(
    regions: Array<{ name: string; polygon: Polygon }>
  ): Promise<Array<{ region: string; count: number; categories: Record<string, number> }>> {
    const results = [];

    for (const region of regions) {
      const features = await this.db.features
        .intersects('geometry', region.polygon)
        .toArray();

      const categories = features.reduce((acc, f) => {
        const category = f.properties.category || 'unknown';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      results.push({
        region: region.name,
        count: features.length,
        categories
      });
    }

    return results;
  }

  async temporalAggregation(
    startTime: number,
    endTime: number,
    interval: number = 3600000 // 1小时
  ): Promise<Array<{ time: number; count: number }>> {
    const features = await this.db.features
      .where('timestamp', '>=', startTime)
      .where('timestamp', '<=', endTime)
      .toArray();

    const buckets = new Map<number, number>();

    for (const feature of features) {
      const bucket = Math.floor(feature.timestamp / interval) * interval;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    return Array.from(buckets.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time - b.time);
  }
}
```

---

## 实战练习

### 场景: 构建离线地图应用

实现一个支持离线使用的城市指南应用，用户可以下载特定区域的数据，离线浏览和查询。

#### 任务要求

1. 实现区域数据下载功能
2. 支持离线查询附近地点
3. 集成Leaflet地图显示
4. 提供数据管理界面（查看已下载区域、删除数据）

#### 实现步骤

<details>
<summary>查看实现步骤</summary>

1. **步骤一**: 初始化项目结构和数据库

   ```typescript
   import { WebGeoDB } from '@webgeodb/core';
   import L from 'leaflet';

   class OfflineCityGuide {
     private db: WebGeoDB;
     private map: L.Map;

     async init() {
       // 初始化数据库
       this.db = new WebGeoDB({
         name: 'city-guide',
         version: 1
       });

       await this.db.open();

       this.db.schema({
         downloadedAreas: {
           id: 'string',
           name: 'string',
           bbox: 'json',
           downloadedAt: 'number',
           featureCount: 'number'
         },
         pois: {
           id: 'string',
           areaId: 'string',
           name: 'string',
           category: 'string',
           geometry: 'geometry',
           properties: 'json'
         }
       });

       // 创建空间索引
       this.db.pois.createIndex('geometry');

       // 初始化地图
       this.map = L.map('map').setView([39.9042, 116.4074], 13);
       L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         attribution: '© OpenStreetMap'
       }).addTo(this.map);
     }
   }
   ```

2. **步骤二**: 实现区域下载功能

   ```typescript
   async downloadArea(
     name: string,
     bounds: L.LatLngBounds
   ): Promise<string> {
     const bbox: [number, number, number, number] = [
       bounds.getWest(),
       bounds.getSouth(),
       bounds.getEast(),
       bounds.getNorth()
     ];

     // 从API获取数据
     const response = await fetch(
       `/api/pois?bbox=${bbox.join(',')}&limit=1000`
     );
     const pois = await response.json();

     // 创建区域记录
     const areaId = crypto.randomUUID();
     await this.db.downloadedAreas.insert({
       id: areaId,
       name,
       bbox,
       downloadedAt: Date.now(),
       featureCount: pois.length
     });

     // 批量插入POI
     const records = pois.map(poi => ({
       ...poi,
       areaId
     }));

     await this.db.pois.bulkPut(records);

     console.log(`Downloaded ${pois.length} POIs for ${name}`);
     return areaId;
   }
   ```

3. **步骤三**: 实现离线查询

   ```typescript
   async findNearbyPOIs(
     center: L.LatLng,
     radius: number = 1000
   ): Promise<Array<{ name: string; category: string; distance: number }>> {
     const nearby = await this.db.pois
       .distance('geometry', [center.lng, center.lat], '<', radius)
       .toArray();

     // 计算实际距离
     const results = nearby.map(poi => {
       const distance = this.map.distance(
         center,
         L.latLng(poi.geometry.coordinates[1], poi.geometry.coordinates[0])
       );

       return {
         name: poi.name,
         category: poi.category,
         distance
       };
     });

     // 按距离排序
     return results.sort((a, b) => a.distance - b.distance);
   }
   ```

4. **步骤四**: 实现地图显示

   ```typescript
   displayPOIs(pois: any[]): void {
     // 清除现有标记
     this.map.eachLayer(layer => {
       if (layer instanceof L.Marker) {
         this.map.removeLayer(layer);
       }
     });

     // 添加新标记
     pois.forEach(poi => {
       const marker = L.marker([
         poi.geometry.coordinates[1],
         poi.geometry.coordinates[0]
       ]);

       marker.bindPopup(`
         <h3>${poi.name}</h3>
         <p>Category: ${poi.category}</p>
       `);

       marker.addTo(this.map);
     });
   }

   async displayDownloadedAreas(): Promise<void> {
     const areas = await this.db.downloadedAreas.toArray();

     areas.forEach(area => {
       const bounds = L.latLngBounds([
         [area.bbox[1], area.bbox[0]],
         [area.bbox[3], area.bbox[2]]
       ]);

       L.rectangle(bounds, {
         color: '#3388ff',
         weight: 2,
         fillOpacity: 0.1
       })
         .bindPopup(`${area.name}<br>POIs: ${area.featureCount}`)
         .addTo(this.map);
     });
   }
   ```

5. **步骤五**: 实现数据管理

   ```typescript
   async getDownloadedAreas(): Promise<Array<{
     id: string;
     name: string;
     featureCount: number;
     downloadedAt: number
   }>> {
     return await this.db.downloadedAreas.toArray();
   }

   async deleteArea(areaId: string): Promise<void> {
     // 删除区域的所有POI
     const pois = await this.db.pois.where('areaId', '=', areaId).toArray();
     await this.db.pois.bulkDelete(pois.map(p => p.id));

     // 删除区域记录
     await this.db.downloadedAreas.delete(areaId);
   }

   async getStorageInfo(): Promise<{
     areas: number;
     pois: number;
   }> {
     const [areas, pois] = await Promise.all([
       this.db.downloadedAreas.count(),
       this.db.pois.count()
     ]);

     return { areas, pois };
   }
   ```

</details>

#### 测试验证

```typescript
// 测试脚本
async function testOfflineCityGuide() {
  const app = new OfflineCityGuide();
  await app.init();

  // 测试1: 下载数据
  const bounds = L.latLngBounds([
    [39.89, 116.39],
    [39.92, 116.42]
  ]);

  const areaId = await app.downloadArea('北京天安门区域', bounds);
  console.log('Downloaded area:', areaId);

  // 测试2: 离线查询
  const center = L.latLng(39.9042, 116.4074);
  const nearby = await app.findNearbyPOIs(center, 1000);
  console.log('Nearby POIs:', nearby);

  // 测试3: 显示地图
  app.displayDownloadedAreas();

  // 测试4: 查看存储信息
  const storageInfo = await app.getStorageInfo();
  console.log('Storage info:', storageInfo);
}

testOfflineCityGuide();
```

#### 答案参考

<details>
<summary>查看完整答案</summary>

完整的实现代码请参考：
- 中文版: `/Users/zhangyuting/github/zhyt1985/webgeodb/docs/tutorials/zh/projects/offline-city-guide/`
- 英文版: `/Users/zhangyuting/github/zhyt1985/webgeodb/docs/tutorials/en/projects/offline-city-guide/`

</details>

---

## 常见问题

### Q: 如何处理大量地图数据导致渲染性能下降？

**A:** 使用以下策略优化性能：

1. **数据分块**: 根据地图视口只加载可见区域的数据
2. **聚类**: 对密集点进行聚类显示
3. **LOD (Level of Detail)**: 根据缩放级别显示不同详细程度的数据
4. **虚拟化**: 只渲染视口内的要素

```typescript
class MapDataManager {
  async loadVisibleData(bounds: L.LatLngBounds, zoom: number) {
    // 根据缩放级别调整查询范围
    const bufferSize = Math.max(0, 0.5 - zoom * 0.05);
    const expandedBounds = bounds.pad(bufferSize);

    // 只查询可见区域的要素
    const features = await this.db.features
      .intersects('geometry', this.boundsToPolygon(expandedBounds))
      .limit(1000) // 限制数量
      .toArray();

    return features;
  }
}
```

### Q: 离线数据如何与服务器数据同步？

**A:** 实现以下同步机制：

1. **版本控制**: 为每个数据项添加版本号
2. **冲突检测**: 比较本地和服务器版本
3. **自动合并**: 使用最后写入胜出或自定义冲突解决策略
4. **增量同步**: 只同步变更的数据

### Q: 如何减少地图应用存储空间占用？

**A:** 使用以下优化策略：

1. **数据压缩**: 使用gzip/brotli压缩GeoJSON
2. **简化几何**: 降低精度，减少顶点数量
3. **按需加载**: 只下载用户需要的区域
4. **定期清理**: 删除过期的离线数据

```typescript
// 简化几何
function simplifyGeometry(geometry: Geometry, tolerance: number): Geometry {
  // 使用Douglas-Peucker算法简化
  // 或使用turf.simplify()
  return geometry;
}

// 压缩数据
function compressData(data: any): string {
  const json = JSON.stringify(data);
  return pako.gzip(json); // 使用pako压缩
}
```

---

## 小结

本章介绍了如何构建完整的实际应用，涵盖了应用架构设计、地图集成、实时追踪、离线支持和数据可视化等关键主题。

### 核心要点回顾

- ✅ **架构设计**: Repository模式和Service层实现关注点分离
- ✅ **地图集成**: 与Leaflet、Mapbox GL无缝集成
- ✅ **实时追踪**: 结合Geolocation API实现位置追踪和轨迹回放
- ✅ **离线支持**: Service Worker和后台同步实现离线优先
- ✅ **数据可视化**: 热力图、聚类、聚合等高级可视化

### 下一步学习

- **[第5章: 高级主题](./chapter-05-advanced-topics.md)** - 性能优化、扩展性、安全
- **[API参考](../../api/reference.md)** - 查看完整API文档
- **[实战示例](../../examples/)** - 查看更多应用示例

---

## 参考资源

- **[Leaflet文档](https://leafletjs.com/)** - Leaflet官方文档
- **[Mapbox GL文档](https://docs.mapbox.com/mapbox-gl-js/)** - Mapbox GL官方文档
- **[Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)** - Service Worker MDN文档
- **[Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)** - Geolocation API文档
- **[GeoJSON规范](https://geojson.org/)** - GeoJSON格式规范